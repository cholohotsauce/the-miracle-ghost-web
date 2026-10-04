"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Neighborhood, Sighting } from "@/content/shows";

/**
 * A hand-drawn style map of Miami with the ghost's sightings, pinned by neighborhood.
 * Drawn in SVG from rough coordinates, so it loads instantly and needs no map service.
 * It is a sketch, not a street map.
 */

// Map window in degrees
const NORTH = 25.885;
const SOUTH = 25.715;
const WEST = -80.265;
const EAST = -80.11;
const W = 600;
const H = Math.round(W * ((NORTH - SOUTH) / ((EAST - WEST) * Math.cos((25.8 * Math.PI) / 180))));

const project = ([lat, lng]: [number, number]) => [((lng - WEST) / (EAST - WEST)) * W, ((NORTH - lat) / (NORTH - SOUTH)) * H] as const;
const path = (pts: [number, number][]) => pts.map((p, i) => `${i ? "L" : "M"}${project(p).map((v) => v.toFixed(1)).join(",")}`).join("") + "Z";

/** Approximate neighborhood centers */
const HOODS: Record<Neighborhood, [number, number]> = {
  "Little River": [25.848, -80.198],
  "Little Haiti": [25.832, -80.2],
  "Design District": [25.813, -80.197],
  Allapattah: [25.815, -80.224],
  Wynwood: [25.8, -80.204],
  Overtown: [25.786, -80.203],
  Downtown: [25.774, -80.198],
  "Little Havana": [25.766, -80.222],
  "Coconut Grove": [25.728, -80.242],
  "Miami Beach": [25.79, -80.132],
};

// The mainland, cut along Biscayne Bay (rough)
const MAINLAND: [number, number][] = [
  [NORTH + 0.01, WEST - 0.01],
  [NORTH + 0.01, -80.181],
  [25.85, -80.183],
  [25.82, -80.186],
  [25.795, -80.187],
  [25.776, -80.186],
  [25.765, -80.19],
  [25.752, -80.203],
  [25.737, -80.222],
  [25.722, -80.243],
  [SOUTH - 0.01, -80.257],
  [SOUTH - 0.01, WEST - 0.01],
];

// Miami Beach, the barrier island (rough)
const BEACH: [number, number][] = [
  [NORTH + 0.01, -80.143],
  [NORTH + 0.01, -80.121],
  [25.85, -80.12],
  [25.82, -80.122],
  [25.795, -80.127],
  [25.775, -80.13],
  [25.766, -80.134],
  [25.768, -80.142],
  [25.79, -80.145],
  [25.82, -80.142],
  [25.85, -80.141],
];

export default function SightingsMap({ sightings }: { sightings: Sighting[] }) {
  const [open, setOpen] = useState<number | null>(null);
  // Several pieces in one neighborhood fan out around its center
  const placed = sightings.map((s, i) => {
    const same = sightings.filter((o) => o.neighborhood === s.neighborhood);
    const k = same.indexOf(s);
    const [x, y] = project(HOODS[s.neighborhood]);
    const a = (k / Math.max(same.length, 1)) * Math.PI * 2;
    const r = same.length > 1 ? 14 : 0;
    return { s, i, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
  const active = open === null ? null : placed[open];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Rough map of Miami with the ghost's sightings" className="h-auto w-full border-2 border-line bg-background">
        <defs>
          <pattern id="water" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" className="stroke-foreground/15" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#water)" />
        <path d={path(MAINLAND)} className="fill-background stroke-foreground" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={path(BEACH)} className="fill-background stroke-foreground" strokeWidth="2.5" strokeLinejoin="round" />
        <text x={project([25.8, -80.163])[0]} y={project([25.8, -80.163])[1]} textAnchor="middle" className="fill-foreground/40 font-mono text-[9px] uppercase tracking-[0.3em]">
          Biscayne Bay
        </text>
        {(Object.keys(HOODS) as Neighborhood[]).map((n) => {
          const [x, y] = project(HOODS[n]);
          return (
            <text key={n} x={x} y={y + 24} textAnchor="middle" className="fill-foreground/55 font-mono text-[8.5px] uppercase tracking-[0.15em]">
              {n}
            </text>
          );
        })}
        {placed.map(({ s, i, x, y }) => (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`${s.name}, ${s.neighborhood}`}
            onClick={() => setOpen(open === i ? null : i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(open === i ? null : i))}
            className="cursor-pointer outline-none [&:focus-visible>path]:stroke-[var(--color-neon-pink)]"
            transform={`translate(${x} ${y})`}
          >
            {/* A little ghost pin */}
            <path
              d="M0,-20 C-8,-20 -10,-13 -10,-7 L-10,4 L-7,1 L-4,4 L-1,1 L2,4 L5,1 L8,4 L10,1 L10,-7 C10,-13 8,-20 0,-20Z"
              className={`stroke-foreground transition-colors ${open === i ? "fill-[var(--color-neon-green)]" : s.status === "buffed" ? "fill-background" : "fill-foreground"}`}
              strokeWidth="2"
            />
            <circle cx="-3.5" cy="-10" r="1.6" className={open === i || s.status === "buffed" ? "fill-foreground" : "fill-background"} />
            <circle cx="3.5" cy="-10" r="1.6" className={open === i || s.status === "buffed" ? "fill-foreground" : "fill-background"} />
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
        <span>● Still running</span>
        <span>○ Buffed (painted over)</span>
        <span>Rough map. Pins sit on the neighborhood, not the wall.</span>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            key={active.i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 flex items-start justify-between gap-4 border-2 border-line bg-background p-4 shadow-[6px_6px_0_var(--color-neon-green)]"
          >
            <div>
              <p className="font-drip text-2xl uppercase leading-none">{active.s.name}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground/70">
                {active.s.neighborhood}
                {active.s.year ? ` · ${active.s.year}` : ""}
                {active.s.status ? ` · ${active.s.status === "running" ? "still running" : "buffed"}` : ""}
              </p>
              {active.s.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- small optional photo from /public
                <img src={active.s.photo} alt={active.s.name} className="mt-3 max-h-64 w-auto border-2 border-line" />
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="h-9 w-9 shrink-0 rounded-full border-2 border-foreground font-mono text-sm"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
