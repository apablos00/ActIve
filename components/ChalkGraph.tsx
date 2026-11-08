"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import WritingHand from "@/components/WritingHand";
import { nice, parseExpression, slopeAt } from "@/lib/graph";
import type { Graph } from "@/lib/types";

// A function graph drawn on the board in chalk: the teacher's hand draws the
// curve, then (for the skiing case) a chalk skier rides it while a tangent
// line follows and the slope is written live. Slope = steepness under the skis.

const W = 360;
const H = 210;
const PAD = { l: 38, r: 16, t: 16, b: 30 };
const DRAW_MS = 1900;
const RIDE_MS = 4600;
const REST_MS = 1100;

export default function ChalkGraph({ graph, accent, delay = 0 }: { graph: Graph; accent: string; delay?: number }) {
  const f = useMemo(() => parseExpression(graph.expression), [graph.expression]);
  const plot = useMemo(() => (f ? build(f, graph) : null), [f, graph]);
  const [drawn, setDrawn] = useState(0); // 0..1 of the curve
  const [ride, setRide] = useState<number | null>(null); // skier x in data units
  const caret = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!plot) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDrawn(1);
      if (graph.skier) setRide(graph.markX ?? (graph.xMin + graph.xMax) / 2);
      return;
    }
    setDrawn(0);
    setRide(null);
    let raf = 0;
    const t0 = performance.now() + delay;
    // Downhill: start at the higher end of the curve.
    const [from, to] = plot.startHigh ? [graph.xMin, graph.xMax] : [graph.xMax, graph.xMin];
    const tick = (now: number) => {
      const t = now - t0;
      if (t < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      if (t < DRAW_MS) {
        setDrawn(easeInOut(t / DRAW_MS));
        raf = requestAnimationFrame(tick);
        return;
      }
      setDrawn(1);
      if (!graph.skier) return;
      // Ride, rest at the bottom, go again.
      const r = ((t - DRAW_MS) % (RIDE_MS + REST_MS)) / RIDE_MS;
      const k = Math.min(1, r);
      setRide(from + (to - from) * (k * k * (1.6 - 0.6 * k))); // speeds up going down
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [plot, graph, delay]);

  if (!f || !plot) return null;

  const tip = plot.pointAt(drawn);
  const markX = ride ?? (graph.markX !== undefined && drawn >= 1 ? graph.markX : null);
  const slope = markX !== null ? slopeAt(f, markX, graph.xMax - graph.xMin) : null;

  return (
    <figure className="flex flex-col gap-2">
      {graph.title && <figcaption className="chalk-hand chalk text-[1.05rem] text-[var(--chalk-dim)]">{graph.title}</figcaption>}
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" role="img" aria-label={`Graph of y = ${graph.expression}`}>
          <g className="chalk" fill="none" stroke="var(--chalk)" strokeLinecap="round" strokeLinejoin="round">
            {/* axes with little arrow heads */}
            <path d={`M${PAD.l} ${H - PAD.b} H${W - PAD.r + 6} m-6 -4 l6 4 l-6 4`} strokeWidth="1.8" opacity="0.8" />
            <path d={`M${PAD.l} ${H - PAD.b} V${PAD.t - 6} m-4 6 l4 -6 l4 6`} strokeWidth="1.8" opacity="0.8" />
            {/* snow under the curve */}
            <path d={plot.fill} fill="var(--chalk)" stroke="none" opacity={0.07 * drawn} />
            {/* the curve itself */}
            <path d={plot.line} strokeWidth="2.6" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drawn} />
          </g>

          {/* axis labels */}
          <g className="chalk-hand" fill="var(--chalk-ghost)" fontSize="11">
            <text x={PAD.l} y={H - PAD.b + 15} textAnchor="middle">{nice(graph.xMin)}</text>
            <text x={W - PAD.r} y={H - PAD.b + 15} textAnchor="middle">{nice(graph.xMax)}</text>
            <text x={PAD.l - 6} y={H - PAD.b} textAnchor="end">{nice(plot.yLo)}</text>
            <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end">{nice(plot.yHi)}</text>
            {graph.xLabel && <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" fontSize="13">{graph.xLabel}</text>}
            {graph.yLabel && <text x={PAD.l + 8} y={PAD.t - 2} fontSize="13">{graph.yLabel}</text>}
          </g>

          {/* tangent + live slope: the derivative, made visible */}
          {markX !== null && slope !== null && Number.isFinite(slope) && (
            <Tangent at={plot.toScreen(markX, f(markX))} screenSlope={plot.screenSlope(slope)} slope={slope} accent={accent} />
          )}

          {ride !== null && <Skier at={plot.toScreen(ride, f(ride))} screenSlope={plot.screenSlope(slopeAt(f, ride, graph.xMax - graph.xMin))} dir={plot.startHigh ? 1 : -1} />}
        </svg>
        {/* where the chalk is right now, for the hand */}
        <span ref={caret} className="absolute h-0 w-0" style={{ left: `${(tip.x / W) * 100}%`, top: `${(tip.y / H) * 100}%` }} />
      </div>
      {drawn > 0 && drawn < 1 && <WritingHand caret={caret} color={accent} tick={Math.round(drawn * 200)} />}
    </figure>
  );
}

function Tangent({ at, screenSlope, slope, accent }: { at: { x: number; y: number }; screenSlope: number; slope: number; accent: string }) {
  const a = Math.atan(screenSlope);
  const dx = Math.cos(a) * 46;
  const dy = Math.sin(a) * 46;
  return (
    <g className="chalk">
      <line x1={at.x - dx} y1={at.y - dy} x2={at.x + dx} y2={at.y + dy} stroke={accent} strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" />
      <circle cx={at.x} cy={at.y} r="3.2" fill={accent} />
      <text x={at.x} y={at.y - 30} textAnchor="middle" className="chalk-hand" fontSize="14" fill={accent}>
        slope {nice(slope)}
      </text>
    </g>
  );
}

// A crouched chalk skier. Local x runs along the skis; y=0 sits on the snow.
function Skier({ at, screenSlope, dir }: { at: { x: number; y: number }; screenSlope: number; dir: 1 | -1 }) {
  const angle = (Math.atan(screenSlope) * 180) / Math.PI;
  return (
    <g transform={`translate(${at.x} ${at.y}) rotate(${angle}) scale(${dir} 1)`} className="chalk" fill="none" stroke="var(--chalk)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M-12 -1 H10 Q14 -1 14 -4" strokeWidth="2" />
      <path d="M-3 -2 L1 -8 L-3 -12" />
      <path d="M-3 -12 L2 -19" />
      <circle cx="4" cy="-22" r="2.8" fill="var(--chalk)" />
      <path d="M0 -17 L7 -13 M7 -13 L-6 -1" strokeWidth="1.2" />
    </g>
  );
}

function build(f: (x: number) => number, g: Graph) {
  const N = 140;
  const xs = Array.from({ length: N + 1 }, (_, i) => g.xMin + ((g.xMax - g.xMin) * i) / N);
  const ys = xs.map((x) => f(x));
  const ok = ys.filter(Number.isFinite);
  if (ok.length < 2 || !(g.xMax > g.xMin)) return null;
  let yLo = Math.min(...ok);
  let yHi = Math.max(...ok);
  if (yLo > 0 && yLo < yHi * 0.4) yLo = 0; // keep the ground in view
  if (yHi === yLo) {
    yHi += 1;
    yLo -= 1;
  }
  const pad = (yHi - yLo) * 0.08;
  yHi += pad;
  if (yLo !== 0) yLo -= pad;

  const toScreen = (x: number, y: number) => ({
    x: PAD.l + ((x - g.xMin) / (g.xMax - g.xMin)) * (W - PAD.l - PAD.r),
    y: H - PAD.b - ((y - yLo) / (yHi - yLo)) * (H - PAD.t - PAD.b),
  });
  const pts = xs.flatMap((x, i) => (Number.isFinite(ys[i]) ? [toScreen(x, ys[i])] : []));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const base = H - PAD.b;
  const fill = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${base} L${pts[0].x.toFixed(1)} ${base} Z`;

  // Arc-length lookup so the hand moves at an even pace along the curve.
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[lens.length - 1] || 1;
  const pointAt = (p: number) => {
    const target = p * total;
    let i = 1;
    while (i < lens.length - 1 && lens[i] < target) i++;
    const k = (target - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k };
  };
  const sxPerUnit = (W - PAD.l - PAD.r) / (g.xMax - g.xMin);
  const syPerUnit = (H - PAD.t - PAD.b) / (yHi - yLo);
  const screenSlope = (dataSlope: number) => (-dataSlope * syPerUnit) / sxPerUnit;
  const first = ok[0];
  const last = ok[ok.length - 1];

  return { line, fill, yLo, yHi, toScreen, pointAt, screenSlope, startHigh: first >= last };
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
