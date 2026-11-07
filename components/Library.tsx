"use client";

import { useEffect, useRef, useState } from "react";
import { MENTORS, type ConceptMap, type StudentProfile } from "@/lib/types";

const PHASES = ["Reading", "Finding concepts", "Making it yours"];

type Props = {
  profile: StudentProfile;
  conceptMap: ConceptMap | null;
  onLoaded: (map: ConceptMap) => void;
  onStart: () => void;
};

export default function Library({ profile, conceptMap, onLoaded, onStart }: Props) {
  const accent = MENTORS[profile.mentor].accent;
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
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
      setError("That's not a PDF.");
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

  const importCanvas = async () => {
    setError(null);
    try {
      const res = await fetch("/demo/lecture.json");
      onLoaded({ ...(await res.json()), source: "canvas" });
    } catch {
      setError("Could not load the Canvas lecture.");
    }
  };

  if (conceptMap && !busy) {
    return (
      <div className="flex w-full max-w-2xl flex-col gap-8 py-10">
        <header className="flex flex-col gap-2">
          {conceptMap.source === "canvas" && (
            <span className="w-fit rounded-full border border-white/15 px-2.5 py-0.5 text-xs text-white/50">From Canvas</span>
          )}
          <h1 className="text-2xl font-medium">{conceptMap.title}</h1>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wider text-white/40">Main ideas</h2>
          <ol className="flex flex-col gap-2">
            {conceptMap.mainIdeas.map((idea, i) => (
              <li key={i} className="flex gap-3 text-white/85">
                <span style={{ color: accent }}>{i + 1}</span>
                {idea}
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs uppercase tracking-wider text-white/40">Concepts</h2>
          <ul className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/10">
            {conceptMap.concepts.map((c) => (
              <li key={c.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs text-white/35">p. {c.pages.join(", ")}</span>
                </div>
                <p className="text-sm text-white/55">
                  <span style={{ color: accent }}>↳ </span>
                  {c.bridge}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-between">
          <button type="button" onClick={() => fileInput.current?.click()} className="text-sm text-white/50 hover:text-white">
            Use another PDF
          </button>
          <button
            type="button"
            onClick={onStart}
            className="rounded-full px-6 py-2.5 text-sm font-medium text-black"
            style={{ background: accent }}
          >
            Start session
          </button>
        </div>
        <HiddenInput inputRef={fileInput} onFile={upload} />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <h1 className="text-2xl font-medium">What are you studying, {profile.name}?</h1>

      <button
        type="button"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) upload(f);
        }}
        className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors"
        style={{ borderColor: dragging || busy ? accent : "rgb(255 255 255 / 0.15)", background: dragging ? `${accent}10` : "transparent" }}
      >
        {busy ? (
          <>
            <span className="text-base" style={{ color: accent }}>{PHASES[phase]}…</span>
            <div className="mt-2 flex gap-1.5">
              {PHASES.map((_, i) => (
                <div key={i} className="h-0.5 w-10 rounded-full transition-colors" style={{ background: i <= phase ? accent : "rgb(255 255 255 / 0.1)" }} />
              ))}
            </div>
          </>
        ) : (
          <>
            <span className="text-base text-white/80">Drop your lecture PDF</span>
            <span className="text-sm text-white/35">or click to choose</span>
          </>
        )}
      </button>

      <div className="flex items-center gap-3 text-xs text-white/30">
        <div className="h-px flex-1 bg-white/10" />
        or
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={importCanvas}
        className="rounded-lg border border-white/10 py-3 text-sm text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-30"
      >
        Import from Canvas
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <HiddenInput inputRef={fileInput} onFile={upload} />
    </div>
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
