"use client";

import { useState } from "react";
import { MENTORS, type MentorId, type StudentProfile } from "@/lib/types";

const HOBBY_CHIPS = ["Football", "Music", "Gaming", "Cooking", "Fitness", "Art", "Travel", "Coding", "Film", "Fashion"];
const CHALLENGE_LABELS = { 1: "Gentle", 2: "Firm", 3: "Relentless" } as const;

const EMPTY: StudentProfile = {
  name: "",
  course: "",
  hobbies: [],
  careerGoal: "",
  mentor: "coach",
  challenge: 2,
};

type Props = {
  initial: StudentProfile | null;
  onDone: (profile: StudentProfile) => void;
};

export default function Onboarding({ initial, onDone }: Props) {
  const [screen, setScreen] = useState<0 | 1 | 2>(0);
  const [p, setP] = useState<StudentProfile>(initial ?? EMPTY);
  const [hobbyDraft, setHobbyDraft] = useState("");

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));

  const toggleHobby = (h: string) =>
    set("hobbies", p.hobbies.includes(h) ? p.hobbies.filter((x) => x !== h) : [...p.hobbies, h]);

  const addHobbyDraft = () => {
    const h = hobbyDraft.trim();
    if (h && !p.hobbies.some((x) => x.toLowerCase() === h.toLowerCase())) set("hobbies", [...p.hobbies, h]);
    setHobbyDraft("");
  };

  const canNext = [
    p.name.trim() !== "" && p.course.trim() !== "",
    p.hobbies.length > 0 && p.careerGoal.trim() !== "",
    true,
  ][screen];

  const next = () => {
    if (!canNext) return;
    if (screen < 2) setScreen((screen + 1) as 0 | 1 | 2);
    else onDone({ ...p, name: p.name.trim(), course: p.course.trim(), careerGoal: p.careerGoal.trim() });
  };

  const accent = MENTORS[p.mentor].accent;
  const customHobbies = p.hobbies.filter((h) => !HOBBY_CHIPS.includes(h));

  return (
    <form
      className="flex w-full max-w-md flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full transition-colors"
            style={{ background: i <= screen ? accent : "rgb(255 255 255 / 0.1)" }}
          />
        ))}
      </div>

      {screen === 0 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-2xl font-medium">Who are you?</h1>
          <Field label="Name">
            <input autoFocus className={inputCls} value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="Alex" />
          </Field>
          <Field label="Course">
            <input className={inputCls} value={p.course} onChange={(e) => set("course", e.target.value)} placeholder="Intro to Microeconomics" />
          </Field>
        </section>
      )}

      {screen === 1 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-2xl font-medium">Your world</h1>
          <Field label="Hobbies">
            <div className="flex flex-wrap gap-2">
              {[...HOBBY_CHIPS, ...customHobbies].map((h) => {
                const on = p.hobbies.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHobby(h)}
                    className="rounded-full border px-3 py-1 text-sm transition-colors"
                    style={on ? { borderColor: accent, color: accent } : { borderColor: "rgb(255 255 255 / 0.15)", color: "rgb(255 255 255 / 0.6)" }}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
            <input
              className={inputCls}
              value={hobbyDraft}
              onChange={(e) => setHobbyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hobbyDraft.trim()) {
                  e.preventDefault();
                  addHobbyDraft();
                }
              }}
              onBlur={addHobbyDraft}
              placeholder="Something else? Type and press Enter"
            />
          </Field>
          <Field label="Career goal">
            <input className={inputCls} value={p.careerGoal} onChange={(e) => set("careerGoal", e.target.value)} placeholder="Start my own company" />
          </Field>
        </section>
      )}

      {screen === 2 && (
        <section className="flex flex-col gap-5">
          <h1 className="text-2xl font-medium">Pick your mentor</h1>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(MENTORS) as MentorId[]).map((id) => {
              const m = MENTORS[id];
              const on = p.mentor === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => set("mentor", id)}
                  className="flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors"
                  style={{ borderColor: on ? m.accent : "rgb(255 255 255 / 0.1)", background: on ? `${m.accent}12` : "transparent" }}
                >
                  <MentorPreview accent={m.accent} active={on} />
                  <span className="text-sm font-medium" style={{ color: on ? m.accent : undefined }}>{m.name}</span>
                  <span className="text-xs leading-snug text-white/50">{m.style}</span>
                </button>
              );
            })}
          </div>
          <Field label="Challenge">
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("challenge", c)}
                  className="rounded-lg border py-2 text-sm transition-colors"
                  style={p.challenge === c ? { borderColor: accent, color: accent } : { borderColor: "rgb(255 255 255 / 0.1)", color: "rgb(255 255 255 / 0.6)" }}
                >
                  {CHALLENGE_LABELS[c]}
                </button>
              ))}
            </div>
          </Field>
        </section>
      )}

      <div className="flex items-center justify-between">
        {screen > 0 ? (
          <button type="button" onClick={() => setScreen((screen - 1) as 0 | 1 | 2)} className="text-sm text-white/50 hover:text-white">
            Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={!canNext}
          className="rounded-full px-6 py-2.5 text-sm font-medium text-black transition-opacity disabled:opacity-30"
          style={{ background: accent }}
        >
          Continue
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base outline-none placeholder:text-white/25 focus:border-white/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
      {children}
    </div>
  );
}

// Small static hologram stand-in until the 3D heads land in Stage 5.
function MentorPreview({ accent, active }: { accent: string; active: boolean }) {
  return (
    <div className="relative flex h-16 w-16 items-end justify-center">
      <div
        className="h-11 w-9 rounded-[45%_45%_40%_40%] border transition-opacity"
        style={{
          borderColor: accent,
          background: `repeating-linear-gradient(0deg, ${accent}33 0 1px, transparent 1px 4px)`,
          boxShadow: `0 0 ${active ? 18 : 8}px ${accent}`,
          opacity: active ? 1 : 0.5,
          marginBottom: 6,
        }}
      />
      <div className="absolute bottom-0 h-1.5 w-12 rounded-[50%]" style={{ background: accent, opacity: active ? 0.7 : 0.3, filter: "blur(2px)" }} />
    </div>
  );
}
