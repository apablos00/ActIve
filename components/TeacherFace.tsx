import type { MentorId } from "@/lib/types";

// Big chalk portraits of the four teachers, showing the vibe at a glance.
const LINE = "var(--chalk)";
const BOARD = "var(--slate-deep)";

function Head({ accent }: { accent: string }) {
  return <ellipse cx="60" cy="66" rx="33" ry="37" fill={accent} fillOpacity="0.28" stroke={LINE} strokeWidth="3" />;
}

// Strict: a ski racer. Swept hair, a headband, brows angled in, a tight little frown.
function Stickler({ accent }: { accent: string }) {
  return (
    <>
      <Head accent={accent} />
      <path d="M27 58 C22 12 92 2 96 54 C88 40 74 34 56 38 C44 40 34 46 27 58 Z" fill={LINE} fillOpacity="0.9" stroke={LINE} strokeWidth="3" />
      <path d="M30 34 C46 24 76 24 91 34 L88 42 C74 35 48 35 33 42 Z" fill={BOARD} stroke={LINE} strokeWidth="2.5" />
      <path d="M36 57 L54 62 M84 57 L66 62" stroke={LINE} strokeWidth="4" />
      <circle cx="45" cy="70" r="3.6" fill={LINE} />
      <circle cx="75" cy="70" r="3.6" fill={LINE} />
      <path d="M49 91 Q60 86 71 91" stroke={LINE} strokeWidth="3.5" />
      <path d="M38 112 L60 104 L82 112" stroke={accent} strokeWidth="6" />
    </>
  );
}

// Relaxed: headphones on, eyes smiling shut, an easy lopsided grin.
function Chill({ accent }: { accent: string }) {
  return (
    <>
      <Head accent={accent} />
      <path d="M24 64 C20 8 100 8 96 64" stroke={LINE} strokeWidth="5" />
      <rect x="17" y="56" width="14" height="27" rx="7" fill={accent} stroke={LINE} strokeWidth="3" />
      <rect x="89" y="56" width="14" height="27" rx="7" fill={accent} stroke={LINE} strokeWidth="3" />
      <path d="M38 64 Q46 56 54 64 M66 64 Q74 56 82 64" stroke={LINE} strokeWidth="3.5" />
      <path d="M43 82 Q60 100 79 79" stroke={LINE} strokeWidth="3.5" />
    </>
  );
}

// Deep: pointed beard, one brow up, eyes drifting to a question.
function Philosopher({ accent }: { accent: string }) {
  return (
    <>
      <Head accent={accent} />
      <path d="M29 73 C33 81 44 85 52 85 L68 85 C76 85 87 81 91 73 C92 89 76 99 60 118 C44 99 28 89 29 73 Z" fill={accent} stroke={LINE} strokeWidth="3" />
      <path d="M46 81 Q53 74 60 79 Q67 74 74 81" stroke={LINE} strokeWidth="3.5" />
      <path d="M36 50 Q45 46 54 51 M66 45 Q76 37 86 46" stroke={LINE} strokeWidth="3.5" />
      <circle cx="45" cy="60" r="7" stroke={LINE} strokeWidth="2.5" />
      <circle cx="75" cy="58" r="7" stroke={LINE} strokeWidth="2.5" />
      <circle cx="48" cy="57" r="2.8" fill={LINE} />
      <circle cx="78" cy="55" r="2.8" fill={LINE} />
      <path d="M53 90 Q60 92 67 90" stroke={BOARD} strokeWidth="3" />
      <path d="M100 16 C99 6 114 6 113 17 C112 24 106 24 106 32" stroke={LINE} strokeWidth="3.5" />
      <circle cx="106" cy="40" r="2.4" fill={LINE} />
    </>
  );
}

// Thrilled: wild hair, huge eyes, brows up, mouth wide open, sparks flying.
function Enthusiast({ accent }: { accent: string }) {
  return (
    <>
      <Head accent={accent} />
      <path
        d="M27 54 L13 44 L27 37 L15 19 L37 25 L39 5 L55 20 L68 3 L76 23 L97 13 L92 35 L108 42 L93 54 C82 42 72 38 60 38 C48 38 38 42 27 54 Z"
        fill={accent}
        stroke={LINE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M35 48 Q45 42 54 48 M66 48 Q75 42 85 48" stroke={LINE} strokeWidth="3.5" />
      <circle cx="45" cy="62" r="9" fill={LINE} />
      <circle cx="75" cy="62" r="9" fill={LINE} />
      <circle cx="45" cy="62" r="4" fill={BOARD} />
      <circle cx="75" cy="62" r="4" fill={BOARD} />
      <path d="M39 78 Q60 74 81 78 Q79 100 60 100 Q41 100 39 78 Z" fill={BOARD} stroke={LINE} strokeWidth="3" />
      <path d="M50 94 Q60 87 70 94 Q66 100 60 100 Q54 100 50 94 Z" fill={accent} />
      <path d="M8 70 L3 66 M10 82 H3 M112 70 L117 66 M110 82 H117" stroke={LINE} strokeWidth="3" />
    </>
  );
}

const FACES = { stickler: Stickler, chill: Chill, philosopher: Philosopher, enthusiast: Enthusiast };

export default function TeacherFace({ mentor, accent, className }: { mentor: MentorId; accent: string; className?: string }) {
  const Face = FACES[mentor];
  return (
    <svg viewBox="0 0 120 120" fill="none" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <Face accent={accent} />
    </svg>
  );
}
