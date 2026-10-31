"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Sighting } from "@/content/shows";
import { MAX_PITCH, REST_PITCH, facing, type PinGroup, type Spin } from "./globeMath";

/**
 * Ghost sightings on a 3D globe (Aes, 2026-10-30), replacing the flat map.
 * It turns very slowly on its own; drag it to spin it, tap a ghost to bring its city to the front
 * and open its card. The 3D part loads after the page, behind a plain grey disc.
 */

const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

/** Drag distance, in pixels, before a press counts as a spin instead of a tap */
const DRAG_START = 4;

export default function SightingsMap({ sightings }: { sightings: Sighting[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // Start with the Americas in front, where most sightings are, tipped a little toward the north
  const spin = useRef<Spin>({ yaw: facing([25, -80]).yaw, pitch: REST_PITCH, vYaw: 0, vPitch: 0, dragging: false, target: null });

  // One pin spot per city; ghosts in the same city stand side by side
  const groups = useMemo(() => {
    const byCity = new Map<string, PinGroup>();
    sightings.forEach((s, i) => {
      const g = byCity.get(s.city) ?? { city: s.city, at: s.at, items: [] };
      g.items.push({ s, i });
      byCity.set(s.city, g);
    });
    return [...byCity.values()];
  }, [sightings]);

  const pick = useCallback(
    (i: number | null) => {
      setOpen((now) => {
        const next = now === i ? null : i;
        spin.current.target = next === null ? null : facing(sightings[next].at);
        spin.current.vYaw = 0;
        return next;
      });
    },
    [sightings],
  );

  // Drag to spin. Only sideways drags are caught on touch screens (touch-action: pan-y),
  // so a finger moving up and down still scrolls the page.
  const press = useRef<{ x: number; y: number; t: number; id: number; moved: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    press.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.moved) {
      if (Math.hypot(dx, dy) < DRAG_START) return;
      p.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      spin.current.dragging = true;
      spin.current.target = null;
    }
    const size = e.currentTarget.clientWidth || 400;
    const k = Math.PI / size; // dragging across the whole globe turns it half a turn
    const now = performance.now();
    const dt = Math.max(1, now - p.t) / 1000;
    const s = spin.current;
    s.yaw += dx * k;
    s.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, s.pitch + dy * k));
    s.vYaw = (dx * k) / dt;
    s.vPitch = (dy * k) / dt;
    p.x = e.clientX;
    p.y = e.clientY;
    p.t = now;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    const s = spin.current;
    if (p.moved) {
      s.dragging = false;
      // A flick keeps spinning for a moment; a press that stopped before letting go does not
      if (performance.now() - p.t > 80) s.vYaw = s.vPitch = 0;
      s.vYaw = Math.max(-4, Math.min(4, s.vYaw));
      s.vPitch = Math.max(-2, Math.min(2, s.vPitch));
    }
  };
  const onPointerCancel = (e: React.PointerEvent) => {
    if (press.current?.id !== e.pointerId) return;
    press.current = null;
    spin.current.dragging = false;
  };

  const active = open === null ? null : sightings[open];

  return (
    <div>
      <div
        role="group"
        aria-label="Globe with the ghost's sightings. Drag to spin it, and pick a ghost to reveal its city."
        className="relative aspect-square w-full max-w-[34rem] cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Stand-in while the 3D globe loads */}
        <div
          aria-hidden
          className={`absolute inset-[6.5%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4c7cc,#8e939b_60%,#6f747c)] transition-opacity duration-700 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        />
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <GlobeScene spin={spin} groups={groups} open={open} onPick={pick} reducedMotion={reducedMotion} onReady={onReady} />
        </div>
      </div>

      <p className="mt-3 text-sm font-bold md:text-base">Only the &lsquo;known&rsquo; world is shown here.</p>

      <AnimatePresence>
        {active && (
          <motion.div
            key={open}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 flex items-start justify-between gap-4 border-2 border-line bg-background p-4 shadow-[6px_6px_0_var(--color-neon-green)]"
          >
            <div>
              <p className="font-drip text-2xl uppercase leading-none">{active.name}</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground/70">
                {active.kind ? `${active.kind} · ` : ""}
                {active.city}
                {active.year ? ` · ${active.year}` : ""}
                {active.status ? ` · ${active.status === "running" ? "still running" : "buffed"}` : ""}
              </p>
              {active.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- small optional photo from /public
                <img src={active.photo} alt={active.name} className="mt-3 max-h-64 w-auto border-2 border-line" />
              )}
            </div>
            <button
              type="button"
              onClick={() => pick(null)}
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
