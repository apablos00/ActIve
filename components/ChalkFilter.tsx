// Shared SVG filter for chalk lettering (used via `filter: url(#chalk-rough)`).
// Rough edges for chalk lettering: a little turbulence displacement.
export default function ChalkFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <filter id="chalk-rough">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}

