"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  BookOpen,
  Brain,
  ChefHat,
  Clapperboard,
  FlaskConical,
  Gamepad2,
  Landmark,
  Leaf,
  MountainSnow,
  Music,
  Palette,
  Plane,
  Scale,
  Tent,
  GraduationCap,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import {
  HOBBIES,
  INTERESTS,
  LEVELS,
  MENTORS,
  PROGRAMMES,
  UNIVERSITIES,
  YEARS_BY_LEVEL,
  type MentorId,
  type StudentProfile,
  type UniversityId,
} from "@/lib/types";
import TeacherFace from "@/components/TeacherFace";
import { Arrow, InkUnderline, Pushpin } from "@/components/Ink";

// Which years a level offers. With no level yet (the year part is still hidden)
// the longest list holds the space on the card.
function yearsFor(level: string): readonly string[] {
  return YEARS_BY_LEVEL[level as keyof typeof YEARS_BY_LEVEL] ?? YEARS_BY_LEVEL.Bachelor;
}

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
  mentor: "enthusiast",
};

// Older saved profiles used free text or other values: keep only what still
// matches today's choices.
function fromSaved(saved: StudentProfile | null): StudentProfile {
  if (!saved) return EMPTY;
  const old = saved as unknown as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const pickMany = (v: unknown, from: readonly string[]) => (Array.isArray(v) ? v.filter((x) => from.includes(x)) : []);
  const pickOne = (v: unknown, from: readonly string[]) => (typeof v === "string" && from.includes(v) ? v : "");
  const level = pickOne(old.level, LEVELS);
  return {
    firstName: text(old.firstName ?? old.name),
    lastName: text(old.lastName),
    interests: pickMany(old.interests, INTERESTS),
    hobbies: pickMany(old.hobbies, HOBBIES),
    university: pickOne(old.university, Object.keys(UNIVERSITIES)) as UniversityId | "",
    programme: pickOne(old.programme, PROGRAMMES),
    level,
    year: level ? pickOne(old.year, yearsFor(level)) : "",
    course: text(old.course),
    mentor: typeof old.mentor === "string" && old.mentor in MENTORS ? (old.mentor as MentorId) : EMPTY.mentor,
  };
}

const STEPS = ["Get to know you", "Your uni", "Pick your mood"];
const LAST = STEPS.length - 1;

const UNI_LOGOS: Partial<Record<UniversityId, string>> = {
  uio: "/logos/uio-mark.svg",
  bi: "/logos/bi-mark.svg",
  oslomet: "/logos/oslomet.svg",
  kristiania: "/logos/kristiania.png",
};

const INTEREST_ICONS: Record<(typeof INTERESTS)[number], LucideIcon> = {
  "Business and economics": TrendingUp,
  "Politics and society": Landmark,
  "Science and tech": FlaskConical,
  "Arts and culture": Palette,
  "Health and psychology": Brain,
  Law: Scale,
  Environment: Leaf,
};

const HOBBY_ICONS: Record<(typeof HOBBIES)[number], LucideIcon> = {
  Sports: Trophy,
  Music: Music,
  Gaming: Gamepad2,
  Reading: BookOpen,
  "Film and series": Clapperboard,
  "Food and cooking": ChefHat,
  Travel: Plane,
  Outdoors: Tent,
  Skiing: MountainSnow,
};

// The parts of each step, in the order they appear: true once answered.
function partsOf(p: StudentProfile): boolean[][] {
  const has = (v: string) => v.trim() !== "";
  return [
    [has(p.firstName) && has(p.lastName), p.interests.length > 0, p.hobbies.length > 0],
    [!!p.university, !!p.programme, !!p.level, !!p.year, has(p.course)],
    [true],
  ];
}

// How much of a step should be on the card: every answered part, the next one
// to answer, and finally the step's button.
function wantedCount(parts: boolean[]) {
  const answered = parts.findIndex((filled) => !filled);
  return (answered === -1 ? parts.length : answered) + 1;
}

// Saved profiles come back fully written, up to the first unanswered part.
function initialShown(p: StudentProfile) {
  let open = true;
  return partsOf(p).map((parts) => {
    const count = open ? wantedCount(parts) : 0;
    open = open && parts.every(Boolean);
    return count;
  });
}

// The free-text part of each step: wait for a pause in typing before moving on.
const TEXT_PART: (number | undefined)[] = [0, 4, undefined];
const TYPING_PAUSE = 600;
const REVEAL_GAP = 220;

type Props = {
  initial: StudentProfile | null;
  startAtTeacher?: boolean; // coming back from the upload screen
  onDone: (profile: StudentProfile) => void;
};

export default function Onboarding({ initial, startAtTeacher, onDone }: Props) {
  const [active, setActive] = useState(startAtTeacher ? LAST : 0);
  const [p, setP] = useState<StudentProfile>(() => fromSaved(initial));
  // How many items of each step are on the card. It only ever grows, so
  // clearing an answer never wipes what is already written below it.
  const [shown, setShown] = useState<number[]>(() => initialShown(fromSaved(initial)));
  const sections = useRef<(HTMLElement | null)[]>([]);
  const firstRender = useRef(true);
  const seen = useRef(shown);

  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => setP((prev) => ({ ...prev, [key]: value }));

  const parts = partsOf(p);
  const valid = parts.map((step) => step.every(Boolean));
  // A step opens once every step before it is filled in.
  const reachable = (i: number) => valid.slice(0, i).every(Boolean);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    sections.current[active]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  const shownNow = shown[active];
  const wanted = wantedCount(parts[active]);
  const typed = p.firstName + p.lastName + p.course;

  const showUpTo = (count: number) => setShown((prev) => prev.map((n, i) => (i === active ? Math.max(n, count) : n)));

  // One item at a time. Typing keeps restarting the wait, so the next part
  // doesn't appear after the first letter of a surname.
  useEffect(() => {
    if (shownNow >= wanted) return;
    const wait = shownNow - 1 === TEXT_PART[active] ? TYPING_PAUSE : REVEAL_GAP;
    const timer = setTimeout(() => setShown((prev) => prev.map((n, i) => (i === active ? Math.max(n, shownNow + 1) : n))), wait);
    return () => clearTimeout(timer);
  }, [active, shownNow, wanted, typed]);

  // Keep the flow moving: a newly written text field takes the cursor, and focus
  // never gets stranded when the button that held it goes away.
  useEffect(() => {
    if (shownNow <= seen.current[active]) return;
    seen.current = seen.current.map((n, i) => (i === active ? shownNow : n));
    const section = sections.current[active];
    const written = section?.querySelectorAll(".reveal-part.is-in");
    const newest = written?.[written.length - 1];
    // On a short laptop screen the new part can land below the fold.
    newest?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    const target = newest?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? newest?.querySelector<HTMLElement>("input, button");
    if (target && (target instanceof HTMLInputElement || !section?.contains(document.activeElement))) {
      target.focus({ preventScroll: true });
    }
  }, [active, shownNow]);

  const next = () => {
    // Enter only leaves a step once its button is on the card, so a quick
    // double press can't skip the step that comes next.
    if (shownNow <= parts[active].length || !valid[active]) return showUpTo(wanted);
    if (active < LAST) setActive(active + 1);
  };

  // Picking a teacher finishes onboarding. The short wait lets the student see
  // their choice land before the screen changes.
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const pickTeacher = (mentor: MentorId) => {
    if (leaving.current || !valid.slice(0, LAST).every(Boolean)) return;
    set("mentor", mentor);
    leaving.current = setTimeout(() => onDone({ ...p, mentor, firstName: p.firstName.trim(), lastName: p.lastName.trim(), course: p.course.trim() }), 320);
  };

  const back = () => {
    setActive(active - 1);
    sections.current[active - 1]?.querySelector<HTMLElement>(".reveal-part.is-in input, .reveal-part.is-in button")?.focus({ preventScroll: true });
  };

  // A new level can rule out the year already picked.
  const pickLevel = (level: string) => setP((prev) => ({ ...prev, level, year: yearsFor(level).includes(prev.year) ? prev.year : "" }));

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
      <Part on={shown[0] > 0}>
        <div className="grid grid-cols-2 gap-4">
          {text("firstName", "Name", undefined, !startAtTeacher)}
          {text("lastName", "Surname")}
        </div>
      </Part>
      <Part on={shown[0] > 1}>
        <Choices label="Areas of interest" hint="pick any">
          {INTERESTS.map((v) => (
            <Chip key={v} icon={INTEREST_ICONS[v]} on={p.interests.includes(v)} accent={accent} onClick={() => toggle("interests", v)}>
              {v}
            </Chip>
          ))}
        </Choices>
      </Part>
      <Part on={shown[0] > 2}>
        <Choices label="Hobbies and free time" hint="pick any">
          {HOBBIES.map((v) => (
            <Chip key={v} icon={HOBBY_ICONS[v]} on={p.hobbies.includes(v)} accent={accent} onClick={() => toggle("hobbies", v)}>
              {v}
            </Chip>
          ))}
        </Choices>
      </Part>
    </>,
    <>
      <Part on={shown[1] > 0}>
        <Choices label="University" single>
          {(Object.keys(UNIVERSITIES) as UniversityId[]).map((id) => (
            <Chip
              key={id}
              single
              on={p.university === id}
              accent={accent}
              onClick={() => set("university", id)}
              title={UNIVERSITIES[id].name}
              logo={UNI_LOGOS[id]}
              icon={UNI_LOGOS[id] ? undefined : GraduationCap}
            >
              {UNIVERSITIES[id].label}
            </Chip>
          ))}
        </Choices>
      </Part>
      <Part on={shown[1] > 1}>
        <Choices label="Study programme" single>
          {PROGRAMMES.map((v) => (
            <Chip key={v} single on={p.programme === v} accent={accent} onClick={() => set("programme", v)}>
              {v}
            </Chip>
          ))}
        </Choices>
      </Part>
      <div className="flex flex-wrap gap-x-6 gap-y-5">
        <Part on={shown[1] > 2}>
          <Choices label="Level" single>
            {LEVELS.map((v) => (
              <Chip key={v} single on={p.level === v} accent={accent} onClick={() => pickLevel(v)}>
                {v}
              </Chip>
            ))}
          </Choices>
        </Part>
        <Part on={shown[1] > 3}>
          <div key={p.level} className="fade-in">
            <Choices label="Year" single>
              {yearsFor(p.level).map((v) => (
                <Chip key={v} single on={p.year === v} accent={accent} onClick={() => set("year", v)}>
                  {v}
                </Chip>
              ))}
            </Choices>
          </div>
        </Part>
      </div>
      <Part on={shown[1] > 4}>{text("course", "Course you're studying now", "For example, Statistics 1")}</Part>
    </>,
    <Part on={shown[2] > 0}>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(MENTORS) as MentorId[]).map((id) => {
          const m = MENTORS[id];
          const on = p.mentor === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => pickTeacher(id)}
              className={`teacher-pick flex flex-col items-center gap-1.5 rounded-xl px-3 pt-2 pb-3 text-center ${on ? "is-on" : ""}`}
            >
              <TeacherFace mentor={id} accent={m.accent} className="teacher-face chalk h-36 w-36" />
              <span className="relative chalk-display chalk text-lg leading-none" style={{ color: on ? m.accent : "var(--chalk)" }}>
                {m.name}
                {on && (
                  <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-1.5 h-1.5 w-full overflow-visible" aria-hidden="true">
                    <path
                      className="draw-in-fast"
                      pathLength={1}
                      d="M1 4 C 28 1, 64 6, 99 2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
              </span>
              <span className="chalk-hand mt-1 text-[0.8rem] leading-snug text-[var(--chalk-dim)]">{m.style}</span>
            </button>
          );
        })}
      </div>
    </Part>,
  ];

  return (
    <div className="classroom fixed inset-0 overflow-y-auto">
      <form
        className="mx-auto flex min-h-full w-full max-w-[1280px] flex-col justify-center gap-6 px-6 py-6"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
        onKeyDown={(e) => {
          // Tabbing out of a text field lands on the part it just unlocked.
          if (e.key === "Tab" && !e.shiftKey && e.target instanceof HTMLInputElement) flushSync(() => showUpTo(wanted));
        }}
      >
        <header className="flex flex-col items-center gap-2 text-center">
          <p className="chalk-hand text-lg text-[var(--chalk-dim)]">Fill in your student card, then pick your mood.</p>
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
                className={`${onBoard ? "board-frame" : "student-card"} relative flex min-w-[330px] flex-1 snap-center flex-col transition-[opacity,rotate,translate,filter,box-shadow,flex-grow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
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
                  <div className={`mt-auto flex items-end justify-between gap-4 pt-2 ${onBoard ? "text-[var(--chalk)]" : "text-[#1f2a44]"}`}>
                    {isActive && i > 0 && (
                      <button type="button" onClick={back} className="ink-link is-back chalk-hand">
                        <span className={onBoard ? "chalk inline-flex items-center gap-2" : "inline-flex items-center gap-2"}>
                          <Arrow back />
                          Back
                        </span>
                      </button>
                    )}
                    {i < LAST && (
                      <Part on={isActive && shown[i] > parts[i].length} className="ml-auto">
                        <button type="submit" disabled={!valid[i]} className="ink-link is-next chalk-hand">
                          <span className="inline-flex items-center gap-2">
                            Continue
                            <Arrow />
                          </span>
                          <InkUnderline />
                        </button>
                      </Part>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </form>
    </div>
  );
}

// One part of a step. It holds its space from the start, so nothing on the card
// moves when it gets written in.
function Part({ on, className = "", children }: { on: boolean; className?: string; children: React.ReactNode }) {
  return <div className={`reveal-part ${on ? "is-in" : ""} ${className}`}>{children}</div>;
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
  icon: Icon,
  logo,
  children,
}: {
  on: boolean;
  single?: boolean;
  accent: string;
  onClick: () => void;
  title?: string;
  icon?: LucideIcon;
  logo?: string;
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
      {Icon && <Icon size={15} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />}
      {logo && <img src={logo} alt="" className="h-5 w-auto shrink-0" />}
      {children}
    </button>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 self-center text-[#2747a8]" aria-label="Done">
      <path d="M4 10.5l3.5 3.5L16 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

