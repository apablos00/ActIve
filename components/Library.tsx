"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { MENTORS, UNIVERSITIES, type ConceptMap, type StudentProfile } from "@/lib/types";
import CanvasPicker from "@/components/CanvasPicker";
import { Arrow, InkUnderline, Pushpin } from "@/components/Ink";

const PHASES = ["Reading", "Finding concepts", "Making it yours"];

type Props = {
  profile: StudentProfile;
  conceptMap: ConceptMap | null;
  onLoaded: (map: ConceptMap) => void;
  onStart: () => void;
  onBack: () => void;
};

export default function Library({ profile, conceptMap, onLoaded, onStart, onBack }: Props) {
  const accent = MENTORS[profile.mentor].accent;
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // One request, so the progress line just walks forward on a timer.
  useEffect(() => {
    if (!busy) return;
    setPhase(0);
    const timers = [setTimeout(() => setPhase(1), 3000), setTimeout(() => setPhase(2), 15000)];
    return () => timers.forEach(clearTimeout);
  }, [busy]);

  const upload = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("That's not a PDF. Try a lecture PDF instead.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("profile", JSON.stringify(profile));
      const res = await fetch("/api/extract", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      onLoaded(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const importCanvas = async (src: string) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error("not found");
    const map = await res.json();
    await new Promise((r) => setTimeout(r, 1200)); // let the import read as a real transfer
    setCanvasOpen(false);
    setError(null);
    onLoaded({ ...map, source: "canvas" });
  };

  // The lesson is ready: it goes up on the board, like the session that follows.
  if (conceptMap && !busy) {
    return (
      <div className="classroom fixed inset-0 overflow-y-auto">
        {/* Fetch the teacher's footage now, so he is on the board the moment the session opens. */}
        <link rel="prefetch" href="/avatars/skier-talking.webm" />
        <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col justify-center px-6 py-8">
          <div className="board-frame relative">
            <Pushpin accent={accent} />
            <div className="board flex flex-col gap-7 p-7">
              <header className="flex flex-col gap-3">
                {conceptMap.source === "canvas" && (
                  <span className="chalk-hand flex items-center gap-2 text-base text-[var(--chalk-dim)]">
                    <img src="/logos/canvas.svg" alt="" className="h-5 w-5" />
                    From Canvas
                  </span>
                )}
                <h1 className="chalk-display chalk text-3xl leading-tight text-[var(--chalk)] [text-wrap:balance]">{conceptMap.title}</h1>
              </header>

              <section className="flex flex-col gap-3">
                <h2 className="chalk-display text-lg text-[var(--chalk-yellow)]">Main ideas</h2>
                <ol className="chalk-hand flex flex-col gap-2 text-[1.08rem] leading-snug text-[var(--chalk)]">
                  {conceptMap.mainIdeas.map((idea, i) => (
                    <li key={i} className="flex gap-3">
                      <span style={{ color: accent }}>{i + 1}.</span>
                      {idea}
                    </li>
                  ))}
                </ol>
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="chalk-display text-lg text-[var(--chalk-yellow)]">Concepts</h2>
                <ul className="flex flex-col gap-3">
                  {conceptMap.concepts.map((c) => (
                    <li key={c.id} className="index-card flex flex-col gap-1 px-4 py-3 text-[#1f2a44]">
                      <div className="flex items-baseline justify-between gap-4">
                        <span className="chalk-display text-lg leading-tight">{c.name}</span>
                        <span className="chalk-hand shrink-0 text-sm text-[#5b6474]">p. {c.pages.join(", ")}</span>
                      </div>
                      <p className="chalk-hand text-[0.98rem] leading-snug text-[#3d4760]">{c.bridge}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <footer className="flex flex-wrap items-end justify-between gap-4 text-[var(--chalk)]">
                <button type="button" onClick={() => fileInput.current?.click()} className="ink-link is-back chalk-hand">
                  Use another PDF
                </button>
                <button type="button" onClick={onStart} className="ink-link is-next chalk-hand">
                  <span className="chalk inline-flex items-center gap-2">
                    Start session
                    <Arrow />
                  </span>
                  <InkUnderline />
                </button>
              </footer>
              {error && <ErrorNote onBoard>{error}</ErrorNote>}
              <HiddenInput inputRef={fileInput} onFile={upload} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const uni = profile.university ? UNIVERSITIES[profile.university] : null;
  const from = uni && profile.university !== "other" ? uni.label : "your university";

  return (
    <div className="classroom fixed inset-0 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[600px] flex-col justify-center px-6 py-8">
        <div className="student-card relative flex flex-col">
          <Pushpin accent={accent} />
          <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
            <h1 className="chalk-display text-2xl leading-none text-[#1f2a44]">What are you studying, {profile.firstName}?</h1>

            <button type="button" disabled={busy} onClick={() => setCanvasOpen(true)} className="canvas-import mt-3">
              <img src="/logos/canvas.svg" alt="" className="h-11 w-11 shrink-0" />
              <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                <span className="chalk-display text-[1.45rem] leading-tight">Import from Canvas</span>
                <span className="chalk-hand text-base leading-tight text-[#4c5670]">Your course slides from {from}</span>
              </span>
              {profile.university === "uio" && <img src="/logos/uio.svg" alt="University of Oslo" className="uio-mark" />}
              <Arrow />
            </button>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f && !busy) upload(f);
              }}
              className={`pdf-drop ${dragging ? "is-over" : ""} ${busy ? "is-busy" : ""}`}
              style={{ "--hl": `${accent}40` } as React.CSSProperties}
            >
              {busy ? (
                <div className="flex w-full flex-col items-center gap-2 py-1" role="status">
                  <span className="chalk-hand text-lg">{PHASES[phase]}…</span>
                  <div className="flex gap-1.5">
                    {PHASES.map((_, i) => (
                      <span key={i} className="h-[3px] w-12 rounded-full transition-colors duration-300" style={{ background: i <= phase ? "#2747a8" : "#9bb3d680" }} />
                    ))}
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => fileInput.current?.click()} className="chalk-hand flex w-full items-center justify-center gap-2 py-1 text-[1.05rem] text-[#3d4760] hover:text-[#2747a8]">
                  <FileUp size={17} strokeWidth={1.75} aria-hidden="true" />
                  Or upload a lecture PDF
                </button>
              )}
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <div className="mt-3 flex text-[#1f2a44]">
              <button type="button" disabled={busy} onClick={onBack} className="ink-link is-back chalk-hand">
                <span className="inline-flex items-center gap-2">
                  <Arrow back />
                  Change mood
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <HiddenInput inputRef={fileInput} onFile={upload} />
      {canvasOpen && <CanvasPicker profile={profile} onClose={() => setCanvasOpen(false)} onPick={importCanvas} />}
    </div>
  );
}

function ErrorNote({ onBoard, children }: { onBoard?: boolean; children: React.ReactNode }) {
  return (
    <p role="alert" className={`chalk-hand text-base ${onBoard ? "text-[#ffb4a8]" : "text-[#a92f2a]"}`}>
      {children}
    </p>
  );
}

function HiddenInput({ inputRef, onFile }: { inputRef: React.RefObject<HTMLInputElement | null>; onFile: (f: File) => void }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onFile(f);
        e.target.value = "";
      }}
    />
  );
}
