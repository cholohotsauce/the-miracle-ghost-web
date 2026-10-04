"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GhostStage from "./ghost/GhostStage";
import SpeechBubble from "./SpeechBubble";
import { CLICKS_PER_CYCLE, TRICK_ORDER, type TrickName } from "./ghost/tricks";
import type { GhostState } from "./ghost/types";
import { setEntered, useEntered } from "@/lib/entry";

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

// Spray-paint specks on the white wall, as in Aes's prototype: [left %, top %, size px, opacity]
const SPECKS: [number, number, number, number][] = [
  [12, 22, 3, 0.8],
  [21, 64, 2, 0.6],
  [8, 81, 4, 0.5],
  [31, 38, 2, 0.4],
  [67, 18, 2, 0.7],
  [78, 47, 3, 0.8],
  [88, 72, 2, 0.5],
  [72, 86, 4, 0.6],
  [93, 31, 2, 0.4],
  [40, 90, 2, 0.5],
  [58, 9, 3, 0.35],
  [4, 46, 2, 0.6],
];

/**
 * Aes's landing: a white page with only his ghost.
 * Click 1 enters (grin + menu). Clicks 1–9 after that play tricks. Click 10 opens the speech bubble.
 */
export default function GhostLanding() {
  const reducedMotion = useReducedMotion() ?? false;
  const entered = useEntered();
  const [clicks, setClicks] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);
  const controls = useRef<GhostState>({
    entered: false,
    tilt: { x: 0, y: 0 },
    trick: { name: null, seq: 0 },
    reducedMotion: false,
  });

  useEffect(() => {
    controls.current.entered = entered;
    controls.current.reducedMotion = reducedMotion;
  }, [entered, reducedMotion]);

  // Cursor steers the ghost until the phone reports tilt
  useEffect(() => {
    let tilt = false;
    let neutralBeta: number | null = null;

    const onPointer = (e: PointerEvent) => {
      if (tilt) return;
      controls.current.tilt.x = clamp((e.clientX / window.innerWidth) * 2 - 1);
      controls.current.tilt.y = clamp(-((e.clientY / window.innerHeight) * 2 - 1));
    };

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // Whatever angle the phone is held at first becomes "level"
      neutralBeta ??= e.beta;
      tilt = true;
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

  const play = useCallback((name: TrickName | null) => {
    const trick = controls.current.trick;
    controls.current.trick = { name, seq: trick.seq + 1 };
  }, []);

  const poke = useCallback(() => {
    if (talking) return;
    if (!entered) {
      // iOS only shares tilt after a tap asks for it, so the entry tap doubles as the ask
      const orientation = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as
        | OrientationPermission
        | undefined;
      orientation?.requestPermission?.().catch(() => {});
      setEntered(true);
      setClicks(0);
      setLabel("grin");
      play("grin");
      return;
    }
    const next = clicks + 1;
    setClicks(next);
    if (next >= CLICKS_PER_CYCLE) {
      setLabel(null);
      setTalking(true);
      play("talk");
    } else {
      const trick = TRICK_ORDER[next - 1];
      setLabel(trick);
      play(trick);
    }
  }, [clicks, entered, play, talking]);

  const hush = useCallback(() => {
    setTalking(false);
    setClicks(0);
    setLabel(null);
    play(null);
  }, [play]);

  return (
    <section aria-label="The Miracle Ghost" className="relative h-[100dvh] w-full overflow-hidden bg-background">
      <h1 className="sr-only">The Miracle Ghost</h1>

      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SPECKS.map(([left, top, size, opacity], i) => (
          <span
            key={i}
            className="absolute rounded-full bg-foreground"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, opacity }}
          />
        ))}
      </div>

      <GhostStage
        controls={controls}
        reducedMotion={reducedMotion}
        onPoke={poke}
        fallback={
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.25em]">
            The ghost needs WebGL to appear.
          </div>
        }
      />

      {/* The click target: covers the ghost so phones get a generous tap area, and keyboards can reach it */}
      <button
        type="button"
        onClick={poke}
        aria-label={entered ? "Poke the ghost" : "Click the ghost to enter"}
        className="absolute left-1/2 top-1/2 h-[min(46dvh,96vw)] w-[min(40dvh,82vw)] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-[45%] focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-offset-8 focus-visible:outline-foreground"
      />

      <AnimatePresence>
        {talking && <SpeechBubble onDone={hush} />}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] md:pb-10">
        <AnimatePresence mode="wait" initial={false}>
          {!entered ? (
            <motion.p
              key="enter"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              className="font-mono text-xs uppercase tracking-[0.3em] text-foreground/70"
            >
              Click the ghost to enter
            </motion.p>
          ) : (
            <motion.div
              key="mascot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col items-center gap-2.5"
            >
              <p aria-live="polite" className="h-4 font-mono text-[11px] uppercase tracking-[0.3em] text-foreground/60">
                {label ?? (talking ? "" : "Poke him")}
              </p>
              <ol aria-label={`${clicks} of ${CLICKS_PER_CYCLE} pokes`} className="flex gap-1.5">
                {Array.from({ length: CLICKS_PER_CYCLE }, (_, i) => (
                  <li
                    key={i}
                    className={`h-1 w-3.5 transition-colors duration-300 ${
                      i < clicks
                        ? i === CLICKS_PER_CYCLE - 1
                          ? "bg-[var(--color-neon-pink)]"
                          : "bg-foreground"
                        : "bg-foreground/15"
                    }`}
                  />
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
