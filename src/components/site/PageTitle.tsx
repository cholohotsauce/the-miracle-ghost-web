import type { ReactNode } from "react";

/**
 * The big title at the top of a content page, with the rule under it (Aes's mockups, 2026-10-15).
 * `bleed` is the Shop's look: heavy block letters with red paint running off them.
 */
export default function PageTitle({
  children,
  bleed = false,
  aside,
}: {
  children: ReactNode;
  bleed?: boolean;
  /** Small text on the right end of the rule */
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-line pb-3 md:mb-10">
      {bleed ? (
        <h1 className="relative inline-block pb-3 text-6xl font-black uppercase leading-none tracking-[0.08em] md:text-8xl">
          {children}
          <Drips />
        </h1>
      ) : (
        <h1 className="font-drip text-7xl uppercase leading-[0.85] md:text-9xl">{children}</h1>
      )}
      {aside && <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">{aside}</p>}
    </header>
  );
}

// Runs of red paint: [x, length, width] in a 100 x 30 box that stretches with the word
const DRIPS: [number, number, number][] = [
  [3, 12, 2],
  [8, 22, 2.6],
  [21, 28, 2.8],
  [32, 10, 1.4],
  [38, 18, 1.8],
  [52, 9, 1.4],
  [60, 20, 2.6],
  [71, 7, 1.2],
  [80, 26, 2.8],
  [93, 14, 1.6],
];

function Drips() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-[70%] h-[0.45em] w-full text-[var(--color-drip-red)]"
    >
      {DRIPS.map(([x, len, w], i) => (
        <g key={i} fill="currentColor">
          <rect x={x - w / 2} y={0} width={w} height={len} rx={w / 2} />
          <ellipse cx={x} cy={len} rx={w * 0.85} ry={w * 1.4} />
        </g>
      ))}
    </svg>
  );
}
