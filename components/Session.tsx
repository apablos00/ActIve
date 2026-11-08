"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import WritingHand from "@/components/WritingHand";
import ChalkGraph from "@/components/ChalkGraph";
import {
  ConversationProvider,
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { MENTORS, UNIVERSITIES, type ConceptMap, type Graph, type MentorId, type SessionResult, type StudentProfile } from "@/lib/types";
import { parseExpression } from "@/lib/graph";

const Hologram = dynamic(() => import("@/components/Hologram"), { ssr: false });

// Must be literal process.env reads so Next inlines them into the client bundle.
const AGENT_IDS: Record<MentorId, string | undefined> = {
  stickler: process.env.NEXT_PUBLIC_AGENT_STICKLER_ID,
  chill: process.env.NEXT_PUBLIC_AGENT_CHILL_ID,
  philosopher: process.env.NEXT_PUBLIC_AGENT_PHILOSOPHER_ID,
  enthusiast: process.env.NEXT_PUBLIC_AGENT_ENTHUSIAST_ID,
};

const PROFESSOR_NAME = "Professor Berg";

type Level = 0 | 1 | 2 | 3;

type Props = {
  profile: StudentProfile;
  conceptMap: ConceptMap;
  onEnd: (result: SessionResult) => void;
};

export default function Session(props: Props) {
  return (
    <ConversationProvider>
      <SessionView {...props} />
    </ConversationProvider>
  );
}

function SessionView({ profile, conceptMap, onEnd }: Props) {
  const mentor = MENTORS[profile.mentor];
  const accent = mentor.accent;
  const agentId = AGENT_IDS[profile.mentor];

  const controls = useConversationControls();
  const { status, message } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const { isMuted: micMuted, setMuted: setMicMuted } = useConversationInput();
  const [volume, setVolume] = useState(0.8);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  // Concept the student asked to hear before the session was connected.
  const pendingExplain = useRef<string | null>(null);

  const [conceptId, setConceptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [drawnGraph, setDrawnGraph] = useState<Graph | null>(null); // from draw_graph
  const [mastery, setMastery] = useState<Record<string, Level>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [glitch, setGlitch] = useState(false);
  const [celebrate, setCelebrate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Latest state for callbacks that outlive a render (tools, end).
  const latest = useRef({ mastery, flagged });
  latest.current = { mastery, flagged };
  const ended = useRef(false);
  const glitchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const think = () => {
    setGlitch(true);
    clearTimeout(glitchTimer.current);
    glitchTimer.current = setTimeout(() => setGlitch(false), 300);
  };
  useEffect(() => () => clearTimeout(glitchTimer.current), []);

  const finish = (fromTool?: { mastered: string[]; review: string[]; answerRequests: number; ownExplanations: number }) => {
    if (ended.current) return;
    ended.current = true;
    const m: Record<string, Level> = {};
    for (const c of conceptMap.concepts) m[c.id] = latest.current.mastery[c.id] ?? 0;
    fromTool?.mastered.forEach((id) => id in m && (m[id] = 3));
    const review = fromTool?.review.filter((id) => id in m) ?? conceptMap.concepts.filter((c) => m[c.id] < 3).map((c) => c.id);
    const answerRequests = fromTool?.answerRequests ?? 0;
    const ownExplanations = fromTool?.ownExplanations ?? Object.values(m).filter((l) => l === 3).length;
    onEnd({
      mastery: m,
      review,
      flagged: latest.current.flagged,
      answerRequests,
      ownExplanations,
      thinkingScore: thinkingScore(m, ownExplanations, answerRequests),
    });
  };

  // Names must match the client tools in the ElevenLabs dashboard.
  const clientTools = useMemo(
    () => ({
      show_concept: ({ concept_id }: { concept_id?: string }) => {
        think();
        if (concept_id && conceptMap.concepts.some((c) => c.id === concept_id)) {
          setConceptId(concept_id);
          setQuestion(null);
          setDrawnGraph(null);
        }
        return "shown";
      },
      show_question: ({ text }: { text?: string }) => {
        if (text) setQuestion(text);
        return "shown";
      },
      draw_graph: (p: { expression?: string; x_min?: unknown; x_max?: unknown; title?: string; x_label?: string; y_label?: string; mark_x?: unknown; skier?: unknown }) => {
        think();
        const xMin = Number(p.x_min);
        const xMax = Number(p.x_max);
        if (!p.expression || !parseExpression(p.expression) || !(xMax > xMin)) {
          return "Could not draw that. Use an expression in x like 100 - 0.5*x^2, and x_min < x_max.";
        }
        const markX = p.mark_x === undefined || p.mark_x === "" ? undefined : Number(p.mark_x);
        setDrawnGraph({
          expression: p.expression,
          xMin,
          xMax,
          title: p.title || undefined,
          xLabel: p.x_label || undefined,
          yLabel: p.y_label || undefined,
          markX: Number.isFinite(markX) ? markX : undefined,
          skier: p.skier === true || p.skier === "true",
        });
        return "drawn on the board";
      },
      update_mastery: ({ concept_id, level }: { concept_id?: string; level?: number | string }) => {
        think();
        const l = Math.max(0, Math.min(3, Math.round(Number(level)))) as Level;
        if (!concept_id || Number.isNaN(l)) return "invalid";
        setMastery((prev) => ({ ...prev, [concept_id]: Math.max(prev[concept_id] ?? 0, l) as Level }));
        if (l === 3) setCelebrate((n) => n + 1);
        return "updated";
      },
      flag_for_professor: ({ question }: { question?: string }) => {
        think();
        if (question) setFlagged((prev) => [...prev, question]);
        return `sent to ${PROFESSOR_NAME}`;
      },
      end_session: (p: { mastered?: unknown; review?: unknown; answer_requests?: unknown; own_explanations?: unknown }) => {
        think();
        const result = {
          mastered: toList(p.mastered),
          review: toList(p.review),
          answerRequests: toCount(p.answer_requests),
          ownExplanations: toCount(p.own_explanations),
        };
        // Let the mentor finish its last line before hanging up.
        setTimeout(() => {
          controls.endSession();
          finish(result);
        }, 2500);
        return "ending";
      },
    }),
    // controls are stable; finish reads state through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conceptMap],
  );

  const start = async () => {
    setError(null);
    if (!agentId) {
      setError(`Missing agent ID. Set NEXT_PUBLIC_AGENT_${profile.mentor.toUpperCase()}_ID in .env.local.`);
      return;
    }
    try {
      // Ask for the mic up front so a denial shows a clear message.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Microphone access is needed to talk to your mentor.");
      return;
    }
    ended.current = false;
    const connect = (connectionType?: "websocket") =>
      controls.startSession({
        agentId,
        ...(connectionType && { connectionType }),
        dynamicVariables: dynamicVariables(profile, conceptMap),
        clientTools,
        onError: (msg: string) => {
          // WebRTC first fetches a token from the browser. When that request is
          // blocked (extension, VPN, flaky network), retry once over WebSocket,
          // which connects to public agents without a token.
          if (!connectionType && msg.includes("conversation token")) return connect("websocket");
          setError(msg);
        },
      });
    connect();
  };

  const connected = status === "connected";

  // Stop button: silence the current turn right away, then tell the agent.
  // The SDK has no public interrupt, so the rest of the cut-off turn (and the
  // agent's short acknowledgement) plays muted. Sound comes back once the
  // agent has been quiet for a moment, or when the student asks for more.
  const [hushed, setHushed] = useState(false);
  const speaking = connected && isSpeaking && !hushed;

  // Re-apply on every connect: a new session starts at full volume.
  useEffect(() => {
    if (connected) controls.setVolume({ volume: speakerMuted || hushed ? 0 : volume });
  }, [connected, volume, speakerMuted, hushed, controls]);

  useEffect(() => {
    if (!hushed || isSpeaking) return;
    const t = setTimeout(() => setHushed(false), HUSH_MS);
    return () => clearTimeout(t);
  }, [hushed, isSpeaking]);

  const stopTalking = () => {
    if (!connected) return;
    setHushed(true);
    // The agent prompt has a rule for this exact token.
    controls.sendUserMessage("[STOP]");
  };

  const sendExplain = (id: string) => {
    const c = conceptMap.concepts.find((x) => x.id === id);
    if (!c) return;
    setHushed(false);
    // The agent prompt has a rule for this exact prefix.
    controls.sendUserMessage(`[EXPLAIN ${c.id}] Please explain "${c.name}" to me out loud.`);
  };

  useEffect(() => {
    if (connected && pendingExplain.current) {
      sendExplain(pendingExplain.current);
      pendingExplain.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const explain = (id: string) => {
    if (connected) return sendExplain(id);
    pendingExplain.current = id;
    if (status !== "connecting") void start();
  };

  const stop = () => {
    controls.endSession();
    finish();
  };

  const concept = conceptMap.concepts.find((c) => c.id === conceptId) ?? null;
  const stateLabel =
    status === "connecting" ? "Connecting…" : connected ? (isSpeaking ? `${mentor.name} is speaking` : "Listening") : `${mentor.name} is ready`;

  return (
    <div className={`classroom fixed inset-0 grid grid-cols-[272px_1fr] grid-rows-[1fr_auto]`}>

      {/* Left: the lesson plan, one index card per concept */}
      <aside className="flex flex-col gap-3 overflow-y-auto px-5 pt-6 pb-8">
        <h2 className="chalk-display mb-2 text-xl leading-tight text-[var(--chalk)]">{conceptMap.title}</h2>
        {conceptMap.concepts.map((c, i) => (
          <IndexCard key={c.id} name={c.name} level={mastery[c.id] ?? 0} current={c.id === conceptId} tilt={i % 2 ? 0.6 : -0.5} accent={accent} />
        ))}
      </aside>

      {/* One wide chalkboard: the teacher is drawn on the left, notes on the right. */}
      <div className="flex min-h-0 py-6 pr-6">
      <div className="board-frame flex min-h-0 flex-1">
      <div className="board relative flex min-h-0 flex-1">
      <section className="board-stage relative min-w-0 flex-1">
        <Hologram
          mentor={profile.mentor}
          accent={accent}
          active={connected}
          getOutputVolume={controls.getOutputVolume}
          getInputVolume={controls.getInputVolume}
          glitch={glitch}
          celebrate={celebrate}
          ski={profile.hobbies.includes("Skiing")}
        />
        <div className="chalk-hand pointer-events-none absolute inset-x-0 top-5 flex items-center justify-center gap-2 text-lg text-[var(--chalk-dim)]">
          <span className="h-2 w-2 rounded-full" style={{ background: accent, boxShadow: connected ? `0 0 10px ${accent}` : "none", opacity: connected ? 1 : 0.4 }} />
          {stateLabel}
        </div>
      </section>

      {/* A chalk line splits the board. */}
      <span aria-hidden="true" className="board-divider" />

      {/* Right half of the board: the notes */}
      <aside className="flex min-h-0 w-[clamp(340px,30vw,420px)] shrink-0 flex-col">
          <div className="relative flex min-h-0 flex-1 flex-col gap-7 overflow-x-hidden overflow-y-auto p-7">
            {concept ? (
              <div key={concept.id} className="relative flex flex-col gap-4">
                <span className="eraser-swipe" aria-hidden="true" />
                <div className="flex items-start justify-between gap-4">
                  <h3 className="chalk-display text-[1.9rem] leading-[1.1] text-[var(--chalk)]">
                    <ChalkText text={concept.name} delay={500} hand={accent} />
                    <ChalkUnderline color={accent} />
                  </h3>
                  <span className="chalk-hand mt-1 shrink-0 rounded-[50%] border-2 border-[var(--chalk-faint)] px-2.5 py-0.5 text-sm text-[var(--chalk-dim)]">
                    p.&nbsp;{concept.pages.join(", ")}
                  </span>
                </div>
                <p className="chalk-hand flex gap-2 text-[1.05rem] leading-snug text-[var(--chalk-dim)]">
                  <ArrowDoodle />
                  <span>
                    <ChalkText text={concept.bridge} delay={500 + concept.name.length * CHALK_MS} hand={accent} />
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => (speaking ? stopTalking() : explain(concept.id))}
                  aria-label={speaking ? `Stop ${mentor.name} talking` : `Hear ${mentor.name} explain ${concept.name}`}
                  className="chalk-button chalk-hand group flex items-center gap-3 self-start rounded-full py-1 pr-4 pl-1 text-[1.05rem] text-[var(--chalk)]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--chalk)] transition-transform group-hover:scale-105">
                    {speaking ? <StopIcon /> : <PlayIcon />}
                  </span>
                  {speaking ? "stop talking" : "explain it to me"}
                </button>
                {(drawnGraph ?? concept.graph) && (
                  <ChalkGraph
                    key={JSON.stringify(drawnGraph ?? concept.graph)}
                    graph={(drawnGraph ?? concept.graph)!}
                    accent={accent}
                    delay={drawnGraph ? 200 : 700 + (concept.name.length + concept.bridge.length) * CHALK_MS}
                  />
                )}
              </div>
            ) : (
              <p className="chalk-hand text-lg leading-snug text-[var(--chalk-ghost)]">
                {connected ? `${mentor.name} will open the first concept.` : `Press Start and ${mentor.name} will open the first concept.`}
              </p>
            )}

            {question && (
              <div key={question} className="flex flex-col gap-3 border-t-2 border-dashed border-[var(--chalk-faint)] pt-6">
                <p className="chalk-hand text-[1.6rem] leading-snug text-[var(--chalk-yellow)]">
                  <span className="chalk-display chalk mr-2">Q.</span>
                  <ChalkText text={question} delay={150} hand={accent} />
                </p>
              </div>
            )}
          </div>
      </aside>
      </div>
      </div>
      </div>

      {/* Bottom: the chalk ledge, controls in the middle */}
      <footer className="ledge col-span-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3.5">
        <div className="min-w-0">
          {(error || (status === "error" && message)) && (
            <span role="alert" className="text-sm text-[#ffb4a8]">
              {error ?? message}
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
        {connected || status === "connecting" ? (
          <button type="button" onClick={stop} className="ledge-btn rounded-full px-6 py-2.5 text-sm">
            End session
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="start-btn flex items-center gap-2.5 rounded-full bg-[var(--chalk)] py-3 pr-9 pl-7 text-base font-semibold text-[#1d2a23] transition-transform hover:-translate-y-px"
            style={{ "--glow": accent } as React.CSSProperties}
          >
            <MicIcon off={false} />
            Start talking to {mentor.name}
          </button>
        )}
        {connected && (
          <button
            type="button"
            onClick={stopTalking}
            disabled={!speaking}
            aria-label={`Stop ${mentor.name} talking`}
            className="ledge-btn flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sm transition-opacity disabled:opacity-35"
          >
            <StopIcon />
            Stop talking
          </button>
        )}
        {connected && (
          <VoiceControls
            accent={accent}
            micMuted={micMuted}
            onMic={() => setMicMuted(!micMuted)}
            volume={volume}
            speakerMuted={speakerMuted}
            onSpeaker={() => setSpeakerMuted(!speakerMuted)}
            onVolume={(v) => {
              setVolume(v);
              setSpeakerMuted(v === 0);
            }}
          />
        )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {flagged.map((q, i) => (
            <span key={i} title={q} className="sticky-note chalk-hand px-3 py-1 text-sm" style={{ rotate: `${i % 2 ? 1.5 : -1.5}deg` }}>
              Sent to {PROFESSOR_NAME}
            </span>
          ))}
          {/* Placeholder: the button is here for the demo. Silent mode itself isn't built yet. */}
          <button type="button" className="ledge-btn flex items-center gap-3 rounded-2xl py-1.5 pr-4 pl-3 text-left">
            <MicIcon off />
            <span className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">Silent mode</span>
              <span className="text-xs leading-tight text-[var(--chalk-dim)]">Can&apos;t talk? Listen and spot the mistakes</span>
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}

function dynamicVariables(profile: StudentProfile, map: ConceptMap) {
  return {
    student_name: profile.firstName,
    full_name: `${profile.firstName} ${profile.lastName}`.trim(),
    interests: profile.interests.join(", ") || "not given",
    hobbies: profile.hobbies.join(", ") || "not given",
    university: profile.university ? UNIVERSITIES[profile.university].name : "not given",
    programme: profile.programme || "not given",
    year: profile.level && profile.year ? `${profile.year} year ${profile.level}` : "not given",
    course: profile.course,
    professor_name: PROFESSOR_NAME,
    material_title: map.title,
    main_ideas: map.mainIdeas.map((m, i) => `${i + 1}. ${m}`).join(" "),
    concepts: map.concepts
      .map((c) =>
        [
          c.id,
          c.name,
          c.explanation,
          c.misconception,
          c.bridge,
          `p.${c.pages.join(",")}`,
          // The board draws this graph when the concept opens.
          ...(c.graph ? [`board graph: y = ${c.graph.expression}${c.graph.skier ? " (a skier rides it, slope shown live)" : ""}`] : []),
        ].join(" | "),
      )
      .join("\n"),
  };
}

// The agent may send arrays or comma-separated strings.
function toList(v: unknown): string[] {
  const items = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  return items.map((x) => String(x).trim()).filter(Boolean);
}

function toCount(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function thinkingScore(mastery: Record<string, Level>, ownExplanations: number, answerRequests: number) {
  const levels: number[] = Object.values(mastery);
  const avg = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;
  return Math.round(40 * (avg / 3) + (30 * Math.min(ownExplanations, 5)) / 5 + 30 * (1 - Math.min(answerRequests, 5) / 5));
}

// ---------- Classroom pieces ----------

const CHALK_MS = 32; // per character, roughly handwriting pace
const HUSH_MS = 1800; // quiet time after Stop before sound comes back
const PROGRESS_LABELS: Record<Level, string> = { 0: "Not started", 1: "Getting there", 2: "Almost there", 3: "Mastered" };

// Writes text out character by character, like chalk on a board.
// Screen readers get the full text at once; reduced motion skips the effect.
function ChalkText({ text, delay = 0, hand }: { text: string; delay?: number; hand?: string }) {
  const [shown, setShown] = useState(0);
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(text.length);
      return;
    }
    setAnimate(true);
    setShown(0);
    let timer: ReturnType<typeof setInterval> | undefined;
    const wait = setTimeout(() => {
      timer = setInterval(() => {
        setShown((n) => {
          if (n + 1 >= text.length) clearInterval(timer);
          return Math.min(n + 1, text.length);
        });
      }, CHALK_MS);
    }, delay);
    return () => {
      clearTimeout(wait);
      clearInterval(timer);
    };
  }, [text, delay]);

  const caret = useRef<HTMLSpanElement>(null);
  const writing = animate && !!hand && shown > 0 && shown < text.length;

  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="chalk">
        {text.slice(0, shown)}
        <span ref={caret} className="inline-block h-[0.9em] w-0" />
        <span className="invisible">{text.slice(shown)}</span>
      </span>
      {writing && <WritingHand caret={caret} color={hand} tick={shown} />}
    </>
  );
}

function ChalkUnderline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 200 10" preserveAspectRatio="none" className="chalk mt-1 block h-2.5 w-3/4" aria-hidden="true">
      <path d="M2 6 C 40 2, 80 9, 120 5 S 180 3, 198 6" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" className="draw-in" pathLength={1} />
    </svg>
  );
}

function ArrowDoodle() {
  return (
    <svg viewBox="0 0 24 24" className="chalk mt-1 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 3c0 7 2 11 12 11" />
      <path d="M13 10l4 4-4 4" />
    </svg>
  );
}

function IndexCard({ name, level, current, tilt, accent }: { name: string; level: Level; current: boolean; tilt: number; accent: string }) {
  return (
    <div
      aria-current={current ? "step" : undefined}
      className="index-card relative px-4 pt-3 pb-2.5 transition-[rotate,translate,box-shadow] duration-500"
      style={{
        rotate: `${current ? 0 : tilt}deg`,
        translate: current ? "8px 0" : "0 0",
        boxShadow: current ? "0 10px 22px rgb(0 0 0 / 0.5), 0 2px 4px rgb(0 0 0 / 0.3)" : "0 2px 5px rgb(0 0 0 / 0.35)",
      }}
    >
      {current && (
        <span
          className="absolute -top-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full"
          style={{ background: `radial-gradient(circle at 35% 30%, #ffffff88 0 20%, ${accent} 45%)`, boxShadow: "0 2px 3px rgb(0 0 0 / 0.45)" }}
          aria-hidden="true"
        />
      )}
      <div className="chalk-hand -mx-4 mb-2 border-b border-[#d9534f] px-4 pb-1.5 text-[0.98rem] leading-tight text-[#1f2a44]">{name}</div>
      <div
        className="flex flex-col gap-1"
        role="progressbar"
        aria-label={`${name} progress`}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={level}
        aria-valuetext={PROGRESS_LABELS[level]}
      >
        {/* Pencil-drawn track, filled with a highlighter stroke. */}
        <div className="relative h-2.5 rounded-full border border-[#5b6b8f]/60">
          <div
            className="highlighter absolute inset-y-[-1px] left-[-1px] rounded-full transition-[width] duration-700 ease-out"
            style={{ width: level ? `calc(${(level / 3) * 100}% + 2px)` : 0, background: level === 3 ? "#2747a8" : `${accent}cc` }}
          />
        </div>
        <div className="chalk-hand flex items-center gap-1 text-xs" style={{ color: level === 3 ? "#2747a8" : "#5b6b8f" }}>
          {level === 3 && (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 10.5l3.5 3.5L16 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {PROGRESS_LABELS[level]}
        </div>
      </div>
    </div>
  );
}

function VoiceControls(p: {
  accent: string;
  micMuted: boolean;
  onMic: () => void;
  volume: number;
  speakerMuted: boolean;
  onSpeaker: () => void;
  onVolume: (v: number) => void;
}) {
  const shown = p.speakerMuted ? 0 : p.volume;
  const step = (d: number) => p.onVolume(Math.round(Math.max(0, Math.min(1, shown + d)) * 10) / 10);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={p.onMic}
        aria-pressed={p.micMuted}
        aria-label={p.micMuted ? "Unmute microphone" : "Mute microphone"}
        title={p.micMuted ? "Unmute mic" : "Mute mic"}
        className={`ledge-btn flex h-10 w-10 items-center justify-center rounded-full ${p.micMuted ? "is-off" : ""}`}
      >
        <MicIcon off={p.micMuted} />
      </button>
      <div className="ledge-btn ml-1 flex items-center gap-1 rounded-full px-1.5 py-1">
        <button
          type="button"
          onClick={p.onSpeaker}
          aria-pressed={p.speakerMuted}
          aria-label={p.speakerMuted ? "Unmute mentor" : "Mute mentor"}
          title={p.speakerMuted ? "Unmute mentor" : "Mute mentor"}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${p.speakerMuted ? "text-[#ffb4a8]" : ""}`}
        >
          <SpeakerIcon level={shown} />
        </button>
        <button type="button" onClick={() => step(-0.1)} aria-label="Lower volume" className="flex h-8 w-8 items-center justify-center rounded-full opacity-75 hover:opacity-100">
          <MinusIcon />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={shown}
          onChange={(e) => p.onVolume(Number(e.target.value))}
          aria-label="Mentor volume"
          className="w-24"
          style={{ accentColor: p.accent }}
        />
        <button type="button" onClick={() => step(0.1)} aria-label="Raise volume" className="flex h-8 w-8 items-center justify-center rounded-full opacity-75 hover:opacity-100">
          <PlusIcon />
        </button>
      </div>
    </div>
  );
}

const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="chalk ml-0.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 4.8 19 12 7.5 19.2z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="chalk" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

function SpeakerIcon({ level }: { level: number }) {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      {level === 0 ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />}
      {level > 0.5 && <path d="M18.5 7a7 7 0 0 1 0 10" />}
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
