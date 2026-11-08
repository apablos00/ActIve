"use client";

import { useEffect, useState } from "react";
import { UNIVERSITIES, type StudentProfile } from "@/lib/types";

// Mocked Canvas import: an LMS-style course page where the student picks a
// slide deck. Only the deck with a `src` is prepared for the demo.

type Deck = { name: string; size: string; date: string; src?: string; isNew?: boolean };
type Module = { title: string; decks: Deck[]; locked?: string };

const MODULES: Module[] = [
  { title: "Week 1 · Functions and graphs", decks: [{ name: "Lecture 1 – Functions and Graphs.pdf", size: "2.1 MB", date: "19 Aug" }] },
  { title: "Week 2 · Linear functions", decks: [{ name: "Lecture 2 – Lines and Slopes.pdf", size: "1.8 MB", date: "26 Aug" }] },
  { title: "Week 3 · Limits", decks: [{ name: "Lecture 3 – Limits and Continuity.pdf", size: "2.4 MB", date: "2 Sep" }] },
  {
    title: "Week 4 · Derivatives",
    decks: [
      { name: "Lecture 4 – Derivatives and Rates of Change.pdf", size: "3.2 MB", date: "9 Sep", src: "/demo/lecture.json", isNew: true },
      { name: "Exercise set 4.pdf", size: "0.6 MB", date: "9 Sep" },
    ],
  },
  { title: "Week 5 · Optimisation", decks: [], locked: "Unlocks 16 Sep" },
];

const OTHER_COURSES = ["Organisational behaviour", "Microeconomics", "Business law"];

type Props = {
  profile: StudentProfile;
  onClose: () => void;
  onPick: (src: string) => Promise<void>;
};

export default function CanvasPicker({ profile, onClose, onPick }: Props) {
  const [phase, setPhase] = useState<"connecting" | "browse" | "importing">("connecting");
  const [picked, setPicked] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const course = profile.course.trim() || "Mathematics";
  const uni = profile.university ? UNIVERSITIES[profile.university].name : "Your university";

  useEffect(() => {
    const t = setTimeout(() => setPhase("browse"), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "importing" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const importDeck = async () => {
    if (!picked?.src) return;
    setError(null);
    setPhase("importing");
    try {
      await onPick(picked.src);
    } catch {
      setError("Could not import that file.");
      setPhase("browse");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Import from Canvas">
      <div className="lms flex h-[min(640px,90vh)] w-[min(1040px,100%)] overflow-hidden rounded-xl bg-white text-[#2d3b45] shadow-2xl">
        {/* global nav rail */}
        <nav className="flex w-[84px] shrink-0 flex-col items-center gap-5 bg-[#2d3b45] py-5 text-[11px] text-white/85" aria-label="Canvas">
          <img src="/logos/canvas.svg" alt="Canvas" className="h-10 w-10" />
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-base font-semibold">
            {(profile.firstName[0] ?? "S").toUpperCase()}
            {(profile.lastName[0] ?? "").toUpperCase()}
          </span>
          <RailItem label="Account" icon="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
          <RailItem label="Dashboard" icon="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
          <RailItem label="Courses" icon="M4 5h12a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3zM4 16a3 3 0 0 1 3-3h12" active />
          <RailItem label="Calendar" icon="M5 6h14v14H5zM5 10h14M9 4v4M15 4v4" />
          <RailItem label="Inbox" icon="M4 6h16v12H4zM4 7l8 6 8-6" />
        </nav>

        {/* course nav */}
        <aside className="hidden w-[190px] shrink-0 flex-col gap-1 border-r border-[#e3e6e8] px-4 py-5 text-sm md:flex">
          <span className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7780]">My courses</span>
          <span className="rounded-md bg-[#e6f1f8] px-3 py-1.5 font-semibold text-[#0b6fa4]">{course}</span>
          {OTHER_COURSES.map((c) => (
            <span key={c} className="px-3 py-1.5 text-[#4a5862]">
              {c}
            </span>
          ))}
        </aside>

        {/* course content */}
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-[#e3e6e8] px-6 py-4">
            <div className="min-w-0">
              <p className="truncate text-xs text-[#6b7780]">{uni} · Autumn 2026</p>
              <h2 className="truncate text-lg">
                <span className="text-[#0b6fa4]">{course}</span>
                <span className="mx-2 text-[#9aa5ad]">›</span>
                Modules
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {profile.university === "uio" && <img src="/logos/uio.svg" alt="University of Oslo" className="h-8 w-auto" />}
              <button type="button" onClick={onClose} disabled={phase === "importing"} aria-label="Close" className="rounded-md p-2 text-[#6b7780] hover:bg-[#f2f4f5] disabled:opacity-40">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </header>

          {phase === "connecting" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#6b7780]">
              <span className="lms-spinner" aria-hidden="true" />
              Connecting to Canvas…
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="flex flex-col gap-4">
                {MODULES.map((m) => (
                  <section key={m.title} className="overflow-hidden rounded-md border border-[#d7dbde]">
                    <h3 className="flex items-center justify-between bg-[#f5f6f7] px-4 py-2.5 text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M6 9l6 6 6-6z" />
                        </svg>
                        {m.title}
                      </span>
                      {m.locked && <span className="text-xs font-normal text-[#6b7780]">Locked · {m.locked}</span>}
                    </h3>
                    {m.decks.map((d) => {
                      const ready = !!d.src;
                      const on = picked?.name === d.name;
                      return (
                        <button
                          key={d.name}
                          type="button"
                          disabled={!ready || phase === "importing"}
                          onClick={() => setPicked(d)}
                          aria-pressed={on}
                          className={`flex w-full items-center gap-3 border-t border-[#e3e6e8] px-4 py-3 text-left text-sm transition-colors ${
                            on ? "bg-[#e6f1f8] outline outline-2 -outline-offset-2 outline-[#0b6fa4]" : ready ? "hover:bg-[#f5f9fc]" : "cursor-default"
                          }`}
                        >
                          <PdfIcon muted={!ready} />
                          <span className={`min-w-0 flex-1 truncate ${ready ? "font-medium text-[#0b6fa4]" : "text-[#4a5862]"}`}>{d.name}</span>
                          {d.isNew && <span className="rounded-full bg-[#0b874b] px-2 py-0.5 text-[11px] font-semibold text-white">New</span>}
                          <span className="hidden w-16 text-right text-xs text-[#6b7780] sm:block">{d.size}</span>
                          <span className="w-14 text-right text-xs text-[#6b7780]">{d.date}</span>
                        </button>
                      );
                    })}
                  </section>
                ))}
              </div>
            </div>
          )}

          <footer className="flex items-center justify-between gap-4 border-t border-[#e3e6e8] bg-[#fafbfb] px-6 py-3.5">
            <span className="min-w-0 truncate text-sm text-[#6b7780]" role={error ? "alert" : undefined}>
              {error ?? (phase === "importing" ? `Importing ${picked?.name}…` : picked ? picked.name : "Choose a slide deck to study.")}
            </span>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={onClose} disabled={phase === "importing"} className="rounded-md border border-[#c7cdd1] bg-white px-4 py-2 text-sm hover:bg-[#f2f4f5] disabled:opacity-40">
                Cancel
              </button>
              <button
                type="button"
                onClick={importDeck}
                disabled={!picked?.src || phase !== "browse"}
                className="flex items-center gap-2 rounded-md bg-[#0b6fa4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#095d8a] disabled:opacity-40"
              >
                {phase === "importing" && <span className="lms-spinner is-light" aria-hidden="true" />}
                Import to Sparring
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function RailItem({ label, icon, active }: { label: string; icon: string; active?: boolean }) {
  return (
    <span className={`flex w-full flex-col items-center gap-1 py-1 ${active ? "bg-white text-[#2d3b45]" : ""}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
        <path d={icon} />
      </svg>
      {label}
    </span>
  );
}

function PdfIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" aria-hidden="true" className="shrink-0">
      <path d="M2 1h12l6 6v18H2z" fill={muted ? "#eef0f1" : "#fdecec"} stroke={muted ? "#b5bec4" : "#c23c3c"} strokeWidth="1.3" />
      <path d="M14 1v6h6" fill="none" stroke={muted ? "#b5bec4" : "#c23c3c"} strokeWidth="1.3" />
      <text x="11" y="20" textAnchor="middle" fontSize="6.5" fontWeight="700" fill={muted ? "#9aa5ad" : "#c23c3c"} fontFamily="system-ui, sans-serif">
        PDF
      </text>
    </svg>
  );
}
