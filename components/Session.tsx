"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ConversationProvider,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { MENTORS, type ConceptMap, type MentorId, type SessionResult, type StudentProfile } from "@/lib/types";

const Hologram = dynamic(() => import("@/components/Hologram"), { ssr: false });

// Must be literal process.env reads so Next inlines them into the client bundle.
const AGENT_IDS: Record<MentorId, string | undefined> = {
  coach: process.env.NEXT_PUBLIC_AGENT_COACH_ID,
  founder: process.env.NEXT_PUBLIC_AGENT_FOUNDER_ID,
  scientist: process.env.NEXT_PUBLIC_AGENT_SCIENTIST_ID,
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

  const [conceptId, setConceptId] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
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
        }
        return "shown";
      },
      show_question: ({ text }: { text?: string }) => {
        if (text) setQuestion(text);
        return "shown";
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
    controls.startSession({
      agentId,
      dynamicVariables: dynamicVariables(profile, conceptMap),
      clientTools,
      onError: (msg: string) => setError(msg),
    });
  };

  const stop = () => {
    controls.endSession();
    finish();
  };

  const connected = status === "connected";
  const concept = conceptMap.concepts.find((c) => c.id === conceptId) ?? null;
  const stateLabel =
    status === "connecting" ? "Connecting…" : connected ? (isSpeaking ? `${mentor.name} is speaking` : "Listening") : `${mentor.name} is ready`;

  return (
    <div className="fixed inset-0 grid grid-cols-[260px_1fr_320px] grid-rows-[1fr_auto] bg-[#05060a]">
      {/* Left: concepts with mastery bars */}
      <aside className="flex flex-col gap-1 overflow-y-auto border-r border-white/5 p-5">
        <h2 className="mb-3 text-xs uppercase tracking-wider text-white/40">{conceptMap.title}</h2>
        {conceptMap.concepts.map((c) => {
          const level = mastery[c.id] ?? 0;
          const current = c.id === conceptId;
          return (
            <div key={c.id} className="rounded-lg px-3 py-2.5 transition-colors" style={{ background: current ? `${accent}14` : "transparent" }}>
              <div className="mb-2 text-sm" style={{ color: current ? accent : "rgb(255 255 255 / 0.75)" }}>{c.name}</div>
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors duration-500"
                    style={{ background: i <= level ? accent : "rgb(255 255 255 / 0.08)" }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </aside>

      {/* Center: the hologram */}
      <section className="relative">
        <Hologram
          mentor={profile.mentor}
          accent={accent}
          active={connected}
          getOutputVolume={controls.getOutputVolume}
          getInputVolume={controls.getInputVolume}
          glitch={glitch}
          celebrate={celebrate}
        />
        <div className="pointer-events-none absolute inset-x-0 top-6 text-center text-xs uppercase tracking-[0.2em]" style={{ color: `${accent}aa` }}>
          {stateLabel}
        </div>
      </section>

      {/* Right: concept card + question card */}
      <aside className="flex flex-col gap-4 overflow-y-auto border-l border-white/5 p-5">
        {concept ? (
          <div className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: `${accent}40` }}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs uppercase tracking-wider text-white/40">Concept</span>
              <span className="text-xs text-white/35">p. {concept.pages.join(", ")}</span>
            </div>
            <h3 className="text-lg font-medium" style={{ color: accent }}>{concept.name}</h3>
            <p className="text-sm text-white/55">
              <span style={{ color: accent }}>↳ </span>
              {concept.bridge}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/30">
            Your mentor will open the first concept.
          </div>
        )}
        {question && (
          <div className="flex flex-col gap-2 rounded-xl p-4" style={{ background: `${accent}12` }}>
            <span className="text-xs uppercase tracking-wider text-white/40">Question</span>
            <p className="text-base leading-snug">{question}</p>
          </div>
        )}
      </aside>

      {/* Bottom: Start / End + professor chips */}
      <footer className="col-span-3 flex items-center gap-4 border-t border-white/5 px-5 py-4">
        {connected || status === "connecting" ? (
          <button type="button" onClick={stop} className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 hover:border-white/30">
            End session
          </button>
        ) : (
          <button type="button" onClick={start} className="rounded-full px-6 py-2.5 text-sm font-medium text-black" style={{ background: accent }}>
            Start
          </button>
        )}
        {(error || (status === "error" && message)) && <span className="text-sm text-red-400">{error ?? message}</span>}
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {flagged.map((q, i) => (
            <span key={i} title={q} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">
              ✓ Sent to your professor
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}

function dynamicVariables(profile: StudentProfile, map: ConceptMap) {
  return {
    student_name: profile.name,
    course: profile.course,
    hobbies: profile.hobbies.join(", "),
    career_goal: profile.careerGoal,
    challenge: profile.challenge,
    professor_name: PROFESSOR_NAME,
    material_title: map.title,
    main_ideas: map.mainIdeas.map((m, i) => `${i + 1}. ${m}`).join(" "),
    concepts: map.concepts
      .map((c) => [c.id, c.name, c.explanation, c.misconception, c.bridge, `p.${c.pages.join(",")}`].join(" | "))
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
