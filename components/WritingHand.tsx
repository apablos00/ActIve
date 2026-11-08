"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

// The hologram teacher's hand, holding a real stick of chalk, following the
// end of the line being written. Rendered in a portal so the board's
// scroll area never clips it.
export default function WritingHand({ caret, color, tick }: { caret: React.RefObject<HTMLSpanElement | null>; color: string; tick: number }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const r = caret.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left, y: r.bottom });
  }, [caret, tick]);
  if (!pos) return null;
  return createPortal(
    <div className="writing-hand" style={{ left: pos.x, top: pos.y, color }} aria-hidden="true">
      <svg viewBox="0 0 120 140" width="128" height="149">
        <defs>
          <filter id="holo-hand" x="-10%" y="-10%" width="120%" height="120%">
            <feMorphology in="SourceGraphic" operator="erode" radius="1.3" result="inner" />
            <feComposite in="SourceGraphic" in2="inner" operator="out" result="edge" />
            <feComponentTransfer in="SourceGraphic" result="body">
              <feFuncA type="linear" slope="0.2" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="body" />
              <feMergeNode in="edge" />
            </feMerge>
          </filter>
          <pattern id="holo-scan" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="1" fill="currentColor" opacity="0.35" />
          </pattern>
        </defs>
        {/* chalk stick: the one solid, physical thing */}
        <line x1="5" y1="5" x2="33" y2="33" stroke="#f4f1e8" strokeWidth="7" strokeLinecap="round" />
        <line x1="7" y1="5" x2="33" y2="31" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        {/* hologram hand */}
        <g filter="url(#holo-hand)" stroke="currentColor" strokeLinecap="round" fill="currentColor">
          <line x1="28" y1="22" x2="64" y2="48" strokeWidth="13" />
          <line x1="22" y1="36" x2="52" y2="68" strokeWidth="12" />
          <line x1="44" y1="58" x2="76" y2="82" strokeWidth="13" />
          <line x1="52" y1="72" x2="82" y2="94" strokeWidth="13" />
          <ellipse cx="74" cy="72" rx="24" ry="28" transform="rotate(-40 74 72)" stroke="none" />
          <line x1="86" y1="98" x2="112" y2="128" strokeWidth="30" />
        </g>
        <g fill="url(#holo-scan)">
          <ellipse cx="74" cy="72" rx="24" ry="28" transform="rotate(-40 74 72)" />
          <line x1="86" y1="98" x2="112" y2="128" stroke="url(#holo-scan)" strokeWidth="30" strokeLinecap="round" />
        </g>
        {/* cuff */}
        <line x1="80" y1="112" x2="102" y2="92" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>,
    document.body,
  );
}
