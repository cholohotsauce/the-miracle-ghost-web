"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Sighting } from "@/content/shows";
import { ENTRANCE_SPEED, ENTRANCE_TURN, MAX_PITCH, REST_PITCH, facing, type PinGroup, type Spin } from "./globeMath";

/**
 * Ghost sightings on a 3D globe (Aes, 2026-10-30), replacing the flat map.
 * It turns very slowly on its own; drag it to spin it, tap a ghost to bring its city to the front
 * and open its card. The 3D part loads after the page, behind a plain grey disc.
 * The first time it comes into view it arrives spinning fast, slows into place, and the ghosts pop up one by one.
 */

const GlobeScene = dynamic(() => import("./GlobeScene"), { ssr: false });

/** Drag distance, in pixels, before a press counts as a spin instead of a tap */
const DRAG_START = 4;

type GlowLevel = 1 | 2 | 3;
const noSubscribe = () => () => {};
const glowFromAddress = (): GlowLevel => {
  const g = new URLSearchParams(window.location.search).get("glow");
  return g === "1" ? 1 : g === "3" ? 3 : 2;
};

/** Where the globe faces at rest: the Americas, where most sightings are */
const HOME = facing([25, -80]);

export default function SightingsMap({ sightings }: { sightings: Sighting[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  // The entrance plays once, when the globe has loaded and is on screen
  const [arrived, setArrived] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  // The grey stand-in stays until the entrance starts, so the jump back for the spin is never seen
  const shown = ready && arrived;
  // Glow strength: 2 by default; ?glow=1 or ?glow=3 on the address previews the others (Round 4, for picking)
  const glow = useSyncExternalStore(noSubscribe, glowFromAddress, () => 2 as GlowLevel);

  // Start with the Americas in front, tipped a little toward the north
  const spin = useRef<Spin>({ yaw: HOME.yaw, pitch: REST_PITCH, vYaw: 0, vPitch: 0, dragging: false, target: null });

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

  useEffect(() => {
    if (!ready || arrived || !box.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const s = spin.current;
        if (!reducedMotion && !s.dragging && !s.target) {
          // Start a little behind, so the fast spin coasts to a stop with the Americas in front
          s.yaw = HOME.yaw - ENTRANCE_TURN;
          s.pitch = REST_PITCH;
          s.vYaw = ENTRANCE_SPEED;
        }
        setArrived(true);
      },
      { threshold: 0.35 },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [ready, arrived, reducedMotion]);

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
        ref={box}
        role="group"
        aria-label="Globe with the ghost's sightings. Drag to spin it, and pick a ghost to reveal its city."
        className="relative aspect-square w-full max-w-[34rem] cursor-grab select-none active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* The neon teal glow that spills from the globe's edge onto the page; it eases off while the globe leans in */}
        <div
          aria-hidden
          className={`globe-glow globe-glow-${glow} absolute inset-0 transition-opacity duration-700 ${
            shown && open === null ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* A soft shadow on the "floor", so the globe floats over the page */}
        <div
          aria-hidden
          className={`absolute bottom-[0.5%] left-1/2 h-[5%] w-[58%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.22),transparent)] transition-opacity duration-700 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Stand-in while the 3D globe loads */}
        <div
          aria-hidden
          className={`absolute inset-[6.5%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#c4c7cc,#8e939b_60%,#6f747c)] transition-opacity duration-700 ${
            shown ? "opacity-0" : "opacity-100"
          }`}
        />
        <div className={`absolute inset-0 transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`}>
          <GlobeScene
            spin={spin}
            groups={groups}
            open={open}
            onPick={pick}
            reducedMotion={reducedMotion}
            arrived={arrived}
            onReady={onReady}
          />
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
