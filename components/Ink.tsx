// Hand-drawn marks shared by the paper cards and the chalkboards.

export function Arrow({ back }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 28 14" className={`ink-arrow h-3.5 w-7 shrink-0 ${back ? "-scale-x-100" : ""}`} aria-hidden="true">
      <path
        d="M2 7.5 C 8 6, 16 8.5, 25 7 M18.5 2 C 21 4, 23 5.5, 26 7 C 23 8.5, 21 10, 18 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InkUnderline() {
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" className="ink-underline" aria-hidden="true">
      <path d="M1 4 C 28 1, 64 6, 99 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Pushpin({ accent }: { accent: string }) {
  return (
    <span
      className="absolute -top-2 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full"
      style={{ background: `radial-gradient(circle at 35% 30%, #ffffff88 0 20%, ${accent} 45%)`, boxShadow: "0 3px 4px rgb(0 0 0 / 0.45)" }}
      aria-hidden="true"
    />
  );
}
