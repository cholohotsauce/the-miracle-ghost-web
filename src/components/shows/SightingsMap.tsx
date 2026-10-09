"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Sighting } from "@/content/shows";
import { WORLD_LAND, WORLD_PROJECTION, WORLD_SIZE } from "@/content/worldMap";

/**
 * A world map with the ghost's sightings, pinned by city.
 * The coastlines are baked into one SVG path (scripts/bake-world-map.mjs), so it loads instantly and needs no map service.
 * Tapping a pin zooms in on it and opens its card.
 */

const { width: W, height: H } = WORLD_SIZE;
const ZOOM = 3;

/** Natural Earth projection, matching the baked outline */
function project([lat, lng]: [number, number]) {
  const lambda = (lng * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  const x = lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
  const y = phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
  return [WORLD_PROJECTION.x + x * WORLD_PROJECTION.scale, WORLD_PROJECTION.y - y * WORLD_PROJECTION.scale] as const;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function SightingsMap({ sightings }: { sightings: Sighting[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState<number | null>(null);
  // Several pieces in one city fan out around its center
  const placed = sightings.map((s, i) => {
    const same = sightings.filter((o) => o.city === s.city);
    const k = same.indexOf(s);
    const [x, y] = project(s.at);
    const a = (k / Math.max(same.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const r = same.length > 1 ? 9 : 0;
    return { s, i, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
  const active = open === null ? null : placed[open];

  // Zoom in on the open pin, kept inside the map
  const vw = active ? W / ZOOM : W;
  const vh = active ? H / ZOOM : H;
  const vx = active ? clamp(active.x - vw / 2, 0, W - vw) : 0;
  const vy = active ? clamp(active.y - vh / 2, 0, H - vh) : 0;
  // Pins keep their size on screen while the map zooms
  const pinScale = (active ? 1 / ZOOM : 1) * 1.6;

  return (
    <div className="relative">
      <motion.svg
        initial={false}
        animate={{ viewBox: `${vx} ${vy} ${vw} ${vh}` }}
        transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        role="img"
        aria-label="World map with the ghost's sightings"
        className="h-auto w-full border-2 border-line bg-background"
        style={{ aspectRatio: `${W} / ${H}` }}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
      >
        <defs>
          <pattern id="water" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="stroke-foreground/15" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#water)" onClick={() => setOpen(null)} />
        <path
          d={WORLD_LAND}
          className="fill-background stroke-foreground"
          strokeWidth="1.2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          onClick={() => setOpen(null)}
        />
        {placed.map(({ s, i, x, y }) => (
          <motion.g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`${s.name}, ${s.city}`}
            onClick={() => setOpen(open === i ? null : i)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(open === i ? null : i))}
            className="cursor-pointer outline-none [&:focus-visible>path]:stroke-[var(--color-neon-pink)]"
            initial={false}
            animate={{ x, y, scale: pinScale }}
            transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformBox: "view-box", originX: 0, originY: 0 }}
          >
            {/* A little ghost pin */}
            <path
              d="M0,-20 C-8,-20 -10,-13 -10,-7 L-10,4 L-7,1 L-4,4 L-1,1 L2,4 L5,1 L8,4 L10,1 L10,-7 C10,-13 8,-20 0,-20Z"
              className={`stroke-foreground transition-colors ${open === i ? "fill-[var(--color-neon-green)]" : s.status === "buffed" ? "fill-background" : "fill-foreground"}`}
              strokeWidth="2"
            />
            <circle cx="-3.5" cy="-10" r="1.6" className={open === i || s.status === "buffed" ? "fill-foreground" : "fill-background"} />
            <circle cx="3.5" cy="-10" r="1.6" className={open === i || s.status === "buffed" ? "fill-foreground" : "fill-background"} />
          </motion.g>
        ))}
      </motion.svg>

      <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
        <span>● Still running</span>
        <span>○ Buffed (painted over)</span>
        <span>Pins sit on the city, not the wall. Tap one to zoom in.</span>
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
                {active.s.city}
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
