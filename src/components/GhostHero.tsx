"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GhostStage from "./ghost/GhostStage";
import type { GhostState } from "./ghost/types";
import tealDripGhost from "@/content/archive/teal-drip-ghost.jpg";

// Glow colors pulled from Rommel's panels
const PALETTE = [
  { name: "Spirit", hex: "#e6eeff" },
  { name: "Teal", hex: "#22f5d6" },
  { name: "Toxic", hex: "#39ff14" },
  { name: "Pink", hex: "#ff3fbf" },
];

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

export default function GhostHero() {
  const reducedMotion = useReducedMotion() ?? false;
  const [awake, setAwake] = useState(false);
  const [colorIndex, setColorIndex] = useState(0);
  const [usingTilt, setUsingTilt] = useState(false);
  const [active, setActive] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const controls = useRef<GhostState>({
    awake: false,
    color: PALETTE[0].hex,
    tilt: { x: 0, y: 0 },
    pokes: 0,
    reducedMotion: false,
  });

  useEffect(() => {
    const c = controls.current;
    c.awake = awake;
    c.color = PALETTE[colorIndex].hex;
    c.reducedMotion = reducedMotion;
  }, [awake, colorIndex, reducedMotion]);

  // Only render while the panel is on screen
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const io = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    io.observe(panel);
    return () => io.disconnect();
  }, []);

  // Cursor steers the ghost until the phone reports tilt
  useEffect(() => {
    let tilt = false;
    let neutralBeta: number | null = null;

    const onPointer = (e: PointerEvent) => {
      const panel = panelRef.current;
      if (tilt || !panel) return;
      const r = panel.getBoundingClientRect();
      controls.current.tilt.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1);
      controls.current.tilt.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1));
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // Whatever angle the phone is held at first becomes "level"
      neutralBeta ??= e.beta;
      if (!tilt) {
        tilt = true;
        setUsingTilt(true);
      }
      controls.current.tilt.x = clamp(e.gamma / 25);
      controls.current.tilt.y = clamp((neutralBeta - e.beta) / 25);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  const wake = useCallback(() => {
    // iOS only shares tilt after a tap asks for it, so the wake tap doubles as the ask
    const orientation = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as
      | OrientationPermission
      | undefined;
    orientation?.requestPermission?.().catch(() => {});
    controls.current.pokes += 1;
    setAwake(true);
  }, []);

  const poke = useCallback(() => {
    if (!controls.current.awake) return wake();
    controls.current.pokes += 1;
    setColorIndex((i) => (i + 1) % PALETTE.length);
  }, [wake]);

  const glow = PALETTE[colorIndex].hex;

  return (
    <section
      aria-label="Wake the Ghost"
      className="relative flex h-[100dvh] w-full flex-col gap-4 px-4 pt-[calc(max(1rem,env(safe-area-inset-top))+3.25rem)] pb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom)+1rem)] md:px-6 md:pt-24 md:pb-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-12 lg:px-12"
    >
      {/* Left wall: the name, big */}
      <div className="hidden lg:flex flex-col justify-end">
        <h1 className="text-[clamp(3.5rem,6.2vw,7rem)] font-black uppercase leading-[0.84] tracking-wide">
          The
          <br />
          Miracle
          <br />
          Ghost
        </h1>
        <p className="mt-6 self-start bg-[var(--color-neon-green)] px-3 py-1 font-mono text-sm uppercase tracking-widest">
          Interactive Art &amp; Apparel
        </p>
      </div>
      <h1 className="sr-only lg:hidden">The Miracle Ghost</h1>

      {/* The panel: a black painting hung on the white wall */}
      <div
        ref={panelRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-[#060609] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.25)] lg:h-full lg:w-[min(calc((100dvh-8rem)*0.8),46vw)] lg:flex-none"
      >
        <GhostStage
          controls={controls}
          awake={awake}
          color={glow}
          reducedMotion={reducedMotion}
          active={active}
          onPoke={poke}
          fallback={<Image src={tealDripGhost} alt="" fill sizes="50vw" className="object-cover" />}
        />

        {/* Vignette keeps the edges falling off into black */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_55%,rgba(0,0,0,0.55)_100%)]"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 md:p-5 font-mono text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-white/55">
          <span>Fig. 01 / Wake the Ghost</span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full transition-all duration-700"
              style={{
                background: awake ? glow : "rgba(255,255,255,0.35)",
                boxShadow: awake ? `0 0 10px 2px ${glow}` : "none",
              }}
            />
            <span aria-live="polite">{awake ? "Awake" : "Dormant"}</span>
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-5 md:p-7">
          <AnimatePresence mode="wait" initial={false}>
            {!awake ? (
              <motion.button
                key="wake"
                type="button"
                onClick={wake}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.4 }}
                className="group relative flex h-12 items-center gap-3 rounded-full border border-white/25 bg-white/[0.04] px-6 font-mono text-xs uppercase tracking-[0.3em] text-white backdrop-blur-sm transition-colors hover:border-white/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                <span aria-hidden className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-white motion-safe:animate-ping opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-white shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]" />
                </span>
                Wake the ghost
              </motion.button>
            ) : (
              <motion.div
                key="palette"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="flex flex-col items-center gap-3"
              >
                <div role="radiogroup" aria-label="Glow color" className="flex items-center gap-1">
                  {PALETTE.map((c, i) => {
                    const selected = i === colorIndex;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={c.name}
                        onClick={() => {
                          controls.current.pokes += 1;
                          setColorIndex(i);
                        }}
                        className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-white"
                      >
                        <span
                          className={`block h-4 w-4 rounded-full transition-all duration-300 ${
                            selected ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#060609]" : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ background: c.hex, boxShadow: `0 0 ${selected ? 16 : 8}px ${c.hex}` }}
                        />
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[10px] md:text-[11px] uppercase tracking-[0.25em] text-white/50">
                  {usingTilt ? "Tilt to steer" : "Move to steer"} · Tap the ghost
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right wall: the placard and the way in */}
      <div className="flex shrink-0 flex-col justify-end gap-5 lg:gap-8">
        <div className="hidden lg:block max-w-xs border-t-2 border-line pt-3 font-mono text-xs uppercase leading-relaxed tracking-[0.2em]">
          <p className="font-sans text-sm font-black tracking-widest">The Miracle Ghost</p>
          <p>Wake the Ghost, 2026</p>
          <p className="mt-2 normal-case tracking-normal text-foreground/60">
            Real-time light on black. The ghost follows your cursor, or your phone&apos;s tilt.
          </p>
        </div>
        <div className="flex items-center gap-3 lg:max-w-xs lg:flex-col lg:items-stretch">
          <Link
            href="/shop"
            className="flex h-12 flex-1 items-center justify-center whitespace-nowrap bg-foreground px-4 font-mono text-xs uppercase tracking-[0.2em] text-background transition-shadow duration-300 hover:shadow-[6px_6px_0_var(--color-neon-green)] lg:flex-none"
          >
            Shop the drop
          </Link>
          <Link
            href="/archive"
            className="flex h-12 flex-1 items-center justify-center whitespace-nowrap border-2 border-line px-4 font-mono text-xs uppercase tracking-[0.2em] transition-shadow duration-300 hover:shadow-[6px_6px_0_var(--color-neon-pink)] lg:flex-none"
          >
            Archive
          </Link>
        </div>
      </div>
    </section>
  );
}
