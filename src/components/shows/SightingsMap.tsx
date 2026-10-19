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

/**
 * Aes's own ghost drawing as the pin, from his "Original Ghost Dropless" file (2026-10-19), in two layers:
 * a body mask that takes the pin's color, and his black linework on top (scripts/make-icons.mjs).
 * The pin's point (0, 0) sits at the tip of the hem, on the city. Aes asked for it about 20% bigger.
 */
const PIN = { x: -12.6, y: -28, width: 25.2, height: 28.9 };
/** Pieces in the same city fan out this far from its center, in pin widths, so each one stays tappable */
const FAN = 0.55;
const PIN_BODY = "/sightings/ghost-pin-body.png";
const PIN_INK = "/sightings/ghost-pin-ink.png";

export default function SightingsMap({ sightings }: { sightings: Sighting[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState<number | null>(null);
  // Pins keep their size on screen while the map zooms
  const pinScale = (open !== null ? 1 / ZOOM : 1) * 2;
  // Several pieces in one city fan out around its center, side by side first, spaced by the pins' size on screen
  const fan = PIN.width * FAN * pinScale;
  const placed = sightings.map((s, i) => {
    const same = sightings.filter((o) => o.city === s.city);
    const k = same.indexOf(s);
    const [x, y] = project(s.at);
    const a = Math.PI + (k / Math.max(same.length, 1)) * Math.PI * 2;
    const r = same.length > 1 ? fan : 0;
    return { s, i, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
  });
  const active = open === null ? null : placed[open];

  // Zoom in on the open pin, kept inside the map
  const vw = active ? W / ZOOM : W;
  const vh = active ? H / ZOOM : H;
  const vx = active ? clamp(active.x - vw / 2, 0, W - vw) : 0;
  const vy = active ? clamp(active.y - vh / 2, 0, H - vh) : 0;

  return (
    <div className="relative">
      <motion.svg
        initial={false}
        animate={{ viewBox: `${vx} ${vy} ${vw} ${vh}` }}
        transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        role="img"
        aria-label="World map with the ghost's sightings"
        className="h-auto w-full border-2 border-line bg-background"
        overflow="hidden"
        style={{ aspectRatio: `${W} / ${H}` }}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)}
      >
        <defs>
          <mask id="ghost-pin" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" {...PIN}>
            <image href={PIN_BODY} {...PIN} preserveAspectRatio="none" />
          </mask>
        </defs>
        <rect width={W} height={H} className="fill-background" onClick={() => setOpen(null)} />
        {/* Aes asked for all the land solid black on the white page (2026-10-19) */}
        <path
          d={WORLD_LAND}
          className="fill-foreground stroke-foreground"
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
            className="cursor-pointer outline-none [&:focus-visible>rect]:fill-[var(--color-neon-pink)]"
            initial={false}
            animate={{ x, y, scale: pinScale }}
            transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformBox: "view-box", originX: 0, originY: 0 }}
          >
            {/* Aes's ghost: white, neon green when open, faded when the piece has been buffed */}
            <rect
              {...PIN}
              mask="url(#ghost-pin)"
              className={`transition-colors ${open === i ? "fill-[var(--color-neon-green)]" : "fill-background"}`}
            />
            <image href={PIN_INK} {...PIN} preserveAspectRatio="none" opacity={s.status === "buffed" && open !== i ? 0.45 : 1} />
            {/* The city, revealed over the selected ghost */}
            {open === i && (
              <g transform={`translate(0 ${PIN.y - 7})`} pointerEvents="none">
                <rect
                  x={-(active!.s.city.length * 3.1 + 7)}
                  y={-8}
                  width={active!.s.city.length * 6.2 + 14}
                  height={14}
                  rx={7}
                  className="fill-background stroke-foreground"
                  strokeWidth="1.2"
                />
                <text textAnchor="middle" y={2.5} className="fill-foreground font-mono uppercase" fontSize="8" letterSpacing="0.6">
                  {s.city}
                </text>
              </g>
            )}
          </motion.g>
        ))}
      </motion.svg>

      <p className="mt-3 text-base md:text-lg">Only the &lsquo;known&rsquo; world is shown here.</p>

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
                {active.s.kind ? `${active.s.kind} · ` : ""}
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
