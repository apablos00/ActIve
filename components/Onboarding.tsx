"use client";

import { useEffect, useRef, useState } from "react";
import {
  HOBBIES,
  INTERESTS,
  LEVELS,
  MENTORS,
  PROGRAMMES,
  UNIVERSITIES,
  YEARS,
  type MentorId,
  type StudentProfile,
  type UniversityId,
} from "@/lib/types";

const EMPTY: StudentProfile = {
  firstName: "",
  lastName: "",
  interests: [],
  hobbies: [],
  university: "",
  programme: "",
  level: "",
  year: "",
  course: "",
  mentor: "chill",
};

// Older saved profiles used free text or other values: keep only what still
// matches today's choices.
function fromSaved(saved: StudentProfile | null): StudentProfile {
  if (!saved) return EMPTY;
  const old = saved as unknown as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const pickMany = (v: unknown, from: readonly string[]) => (Array.isArray(v) ? v.filter((x) => from.includes(x)) : []);
  const pickOne = (v: unknown, from: readonly string[]) => (typeof v === "string" && from.includes(v) ? v : "");
  return {
    firstName: text(old.firstName ?? old.name),
    lastName: text(old.lastName),
    interests: pickMany(old.interests, INTERESTS),
    hobbies: pickMany(old.hobbies, HOBBIES),
    university: pickOne(old.university, Object.keys(UNIVERSITIES)) as UniversityId | "",
    programme: pickOne(old.programme, PROGRAMMES),
    level: pickOne(old.level, LEVELS),
    year: pickOne(old.year, YEARS),
    course: text(old.course),
    mentor: typeof old.mentor === "string" && old.mentor in MENTORS ? (old.mentor as MentorId) : EMPTY.mentor,
  };
}

const STEPS = ["Get to know you", "Your uni", "Pick your teacher"];
const LAST = STEPS.length - 1;

type Props = {
  initial: StudentProfile | null;
  onDone: (profile: StudentProfile) => void;
};

export default function Onboarding({ initial, onDone }: Props) {
  const [active, setActive] = useState(0);
  const [p, setP] = useState<StudentProfile>(() => fromSaved(initial));
  const sections = useRef<(HTMLElement | null)[]>([]);
  const firstRender = useRef(true);

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => setP((prev) => ({ ...prev, [key]: value }));
  const has = (v: string) => v.trim() !== "";

  const valid = [
    has(p.firstName) && has(p.lastName) && p.interests.length > 0 && p.hobbies.length > 0,
    !!p.university && !!p.programme && !!p.level && !!p.year && has(p.course),
    true,
  ];
  // A step opens once every step before it is filled in.
  const reachable = (i: number) => valid.slice(0, i).every(Boolean);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    sections.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  const next = () => {
    if (!valid[active]) return;
    if (active < LAST) return setActive(active + 1);
    onDone({ ...p, firstName: p.firstName.trim(), lastName: p.lastName.trim(), course: p.course.trim() });
  };

  const accent = MENTORS[p.mentor].accent;
  const text = (key: "firstName" | "lastName" | "course", label: string, placeholder?: string, autoFocus = false) => (
    <label className="flex flex-col gap-0.5">
      <FieldLabel>{label}</FieldLabel>
      <input autoFocus={autoFocus} className="card-input chalk-hand" value={p[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
    </label>
  );
  const toggle = (key: "interests" | "hobbies", v: string) =>
    set(key, p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v]);

  const bodies = [
    <>
      <div className="grid grid-cols-2 gap-4">
        {text("firstName", "Name", undefined, true)}
        {text("lastName", "Surname")}
      </div>
      <Choices label="Areas of interest" hint="pick any">
        {INTERESTS.map((v) => (
          <Chip key={v} on={p.interests.includes(v)} accent={accent} onClick={() => toggle("interests", v)}>
            {v}
          </Chip>
        ))}
      </Choices>
      <Choices label="Hobbies and free time" hint="pick any">
        {HOBBIES.map((v) => (
          <Chip key={v} on={p.hobbies.includes(v)} accent={accent} onClick={() => toggle("hobbies", v)}>
            {v}
          </Chip>
        ))}
      </Choices>
    </>,
    <>
      <Choices label="University" single>
        {(Object.keys(UNIVERSITIES) as UniversityId[]).map((id) => (
          <Chip key={id} single on={p.university === id} accent={accent} onClick={() => set("university", id)} title={UNIVERSITIES[id].name}>
            {UNIVERSITIES[id].label}
          </Chip>
        ))}
      </Choices>
      <Choices label="Study programme" single>
        {PROGRAMMES.map((v) => (
          <Chip key={v} single on={p.programme === v} accent={accent} onClick={() => set("programme", v)}>
            {v}
          </Chip>
        ))}
      </Choices>
      <div className="flex flex-wrap gap-x-6 gap-y-5">
        <Choices label="Level" single>
          {LEVELS.map((v) => (
            <Chip key={v} single on={p.level === v} accent={accent} onClick={() => set("level", v)}>
              {v}
            </Chip>
          ))}
        </Choices>
        <Choices label="Year" single>
          {YEARS.map((v) => (
            <Chip key={v} single on={p.year === v} accent={accent} onClick={() => set("year", v)}>
              {v}
            </Chip>
          ))}
        </Choices>
      </div>
      {text("course", "Course you're studying now", "For example, Statistics 1")}
    </>,
    <div className="grid grid-cols-2 gap-3">
      {(Object.keys(MENTORS) as MentorId[]).map((id) => {
        const m = MENTORS[id];
        const on = p.mentor === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => set("mentor", id)}
            className="teacher-pick relative flex flex-col items-center gap-2 rounded-xl px-3 pt-3 pb-3.5 text-center"
            style={{ "--accent": m.accent } as React.CSSProperties}
          >
            {on && <ChalkRing />}
            <MentorPreview accent={m.accent} active={on} />
            <span className="chalk-display chalk text-lg leading-none" style={{ color: on ? m.accent : "var(--chalk)" }}>
              {m.name}
            </span>
            <span className="chalk-hand text-[0.8rem] leading-snug text-[var(--chalk-dim)]">{m.style}</span>
          </button>
        );
      })}
    </div>,
  ];

  return (
    <div className="classroom fixed inset-0 overflow-y-auto">
      <form
        className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col justify-center gap-10 px-6 py-10"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <header className="flex flex-col items-center gap-2 text-center">
          <p className="chalk-hand text-lg text-[var(--chalk-dim)]">Fill in your student card, then pick your teacher.</p>
        </header>

        <div className="flex snap-x snap-mandatory items-stretch gap-6 overflow-x-auto px-2 pt-4 pb-6">
          {STEPS.map((title, i) => {
            const isActive = i === active;
            const open = reachable(i);
            const done = i < active && valid[i];
            const onBoard = i === LAST;
            const tilt = isActive ? 0 : i % 2 ? 1.2 : -1;
            return (
              <section
                key={title}
                ref={(el) => void (sections.current[i] = el)}
                inert={!open}
                aria-current={isActive ? "step" : undefined}
                onFocusCapture={() => open && !isActive && setActive(i)}
                onPointerDown={() => open && !isActive && setActive(i)}
                className={`${onBoard ? "board-frame" : "student-card"} relative flex min-w-[330px] flex-1 snap-center flex-col transition-[opacity,rotate,translate,filter,box-shadow] duration-500`}
                style={{
                  flexGrow: isActive ? 1.35 : 1,
                  rotate: `${tilt}deg`,
                  translate: isActive ? "0 -6px" : "0 0",
                  opacity: open ? 1 : 0.45,
                  filter: isActive ? "none" : "brightness(0.62) saturate(0.7)",
                  cursor: !isActive && open ? "pointer" : undefined,
                }}
              >
                {isActive && <Pushpin accent={accent} />}
                <div className={`${onBoard ? "board p-6" : "px-6 pt-5 pb-6"} flex flex-1 flex-col gap-5`}>
                  <h2
                    className={`chalk-display flex items-baseline gap-2.5 text-2xl leading-none ${onBoard ? "chalk text-[var(--chalk)]" : "text-[#1f2a44]"}`}
                  >
                    {done ? <Tick /> : <span className={`chalk-hand text-base ${onBoard ? "text-[var(--chalk-dim)]" : "text-[#d9534f]"}`}>{i + 1}.</span>}
                    {title}
                  </h2>
                  {bodies[i]}
                  {isActive && (
                    <div className="mt-auto flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={!valid[i]}
                        className={`rounded-full px-7 py-2.5 text-sm font-semibold transition-[opacity,translate] hover:-translate-y-px disabled:translate-y-0 disabled:opacity-35 ${
                          onBoard ? "bg-[var(--chalk)] text-[#1d2a23]" : "bg-[#1f2a44] text-[#f4efe1]"
                        }`}
                      >
                        {i === LAST ? `Start with ${MENTORS[p.mentor].name}` : "Continue"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex items-baseline gap-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-[#5b6474]">
      {children}
      {hint && <span className="chalk-hand text-xs normal-case tracking-normal text-[#5f6880]">{hint}</span>}
    </span>
  );
}

function Choices({ label, hint, single, children }: { label: string; hint?: string; single?: boolean; children: React.ReactNode }) {
  return (
    <div role={single ? "radiogroup" : "group"} aria-label={label} className="flex flex-col gap-2">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

// A handwritten option on the card. Picked ones get a highlighter stroke.
function Chip({
  on,
  single,
  accent,
  onClick,
  title,
  children,
}: {
  on: boolean;
  single?: boolean;
  accent: string;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={single ? "radio" : undefined}
      aria-checked={single ? on : undefined}
      aria-pressed={single ? undefined : on}
      onClick={onClick}
      title={title}
      className={`card-chip chalk-hand ${on ? "is-on" : ""}`}
      style={{ "--hl": `${accent}66` } as React.CSSProperties}
    >
      {children}
    </button>
  );
}

function Pushpin({ accent }: { accent: string }) {
  return (
    <span
      className="absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full"
      style={{ background: `radial-gradient(circle at 35% 30%, #ffffff88 0 20%, ${accent} 45%)`, boxShadow: "0 3px 4px rgb(0 0 0 / 0.45)" }}
      aria-hidden="true"
    />
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 self-center text-[#2747a8]" aria-label="Done">
      <path d="M4 10.5l3.5 3.5L16 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// A loose chalk circle drawn around the chosen teacher.
function ChalkRing() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="chalk pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      <path
        d="M50 3 C 80 2, 98 20, 97 50 C 96 82, 78 97, 49 97 C 18 97, 3 80, 3 50 C 3 22, 20 5, 53 4"
        fill="none"
        stroke="var(--chalk)"
        strokeWidth="1.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Small static hologram head, matching the session's 3D mentor.
function MentorPreview({ accent, active }: { accent: string; active: boolean }) {
  return (
    <div className="relative flex h-16 w-16 items-end justify-center">
      <div
        className="h-11 w-9 rounded-[45%_45%_40%_40%] border transition-opacity"
        style={{
          borderColor: accent,
          background: `repeating-linear-gradient(0deg, ${accent}33 0 1px, transparent 1px 4px)`,
          boxShadow: `0 0 ${active ? 18 : 8}px ${accent}`,
          opacity: active ? 1 : 0.55,
          marginBottom: 6,
        }}
      />
      <div className="absolute bottom-0 h-1.5 w-12 rounded-[50%]" style={{ background: accent, opacity: active ? 0.7 : 0.3, filter: "blur(2px)" }} />
    </div>
  );
}
