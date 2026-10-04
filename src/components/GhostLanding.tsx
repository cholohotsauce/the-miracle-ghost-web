"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GhostPoster from "./ghost/GhostPoster";
import PaintWall from "./PaintWall";
import SpeechBubble from "./SpeechBubble";
import { CLICKS_PER_CYCLE, TRICK_ORDER, type TrickName } from "./ghost/tricks";
import type { GhostState } from "./ghost/types";
import { setEntered, useEntered } from "@/lib/entry";
import { useGhostEvents } from "@/lib/ghostBus";
import { track } from "@/lib/stats";
import { useIdleMood, type Mood } from "@/lib/useIdleMood";

// three.js and the model load after the page shows; the still poster covers the gap
const GhostStage = dynamic(() => import("./ghost/GhostStage"), { ssr: false });

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

/** Two taps on the empty wall within this many ms opens paint mode */
const DOUBLE_TAP_MS = 450;

/** What the caption under the ghost says for each idle mood */
const MOOD_LABEL: Record<Mood, string | null> = {
  awake: null,
  bored: "bored…",
  yawn: "yaaawn",
  asleep: "shh. he's asleep",
};

/**
 * Aes's landing: a white page with only his ghost.
 * Click 1 enters (grin + menu). Clicks 1–9 after that play tricks. Click 10 opens the speech bubble.
 * Leave him alone and he gets bored, yawns, and falls asleep; wake him and he's grumpy.
 * Double-tap the empty wall to spray paint on it.
 */
export default function GhostLanding() {
  const reducedMotion = useReducedMotion() ?? false;
  const entered = useEntered();
  const [clicks, setClicks] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);
  const [painting, setPainting] = useState(false);
  const [paintHint, setPaintHint] = useState(false);
  const [ready, setReady] = useState(false);
  const lastWallTap = useRef(0);
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

  const { mood, wake } = useIdleMood({
    paused: talking || painting,
    onMood: useCallback(
      (m: Mood) => {
        if (m === "awake") {
          // Moving the mouse snaps him out of a bored spell
          if (controls.current.trick.name === "bored" || controls.current.trick.name === "yawn") play(null);
          return;
        }
        setLabel(null);
        play(m === "asleep" ? "sleep" : m);
      },
      [play],
    ),
  });

  useGhostEvents((event) => {
    if (event.type !== "welcome-back" || talking || painting || mood === "asleep") return;
    wake();
    setLabel("missed me?");
    play("boo");
  });

  const poke = useCallback(() => {
    if (talking || painting) return;
    // A sleeping ghost wakes up grumpy, and that poke doesn't count
    if (wake() === "asleep" && entered) {
      setLabel("grumpy");
      play("grumpy");
      track("ghost_woke_up");
      return;
    }
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
      track("ghost_enter");
      return;
    }
    const next = clicks + 1;
    setClicks(next);
    if (next >= CLICKS_PER_CYCLE) {
      setLabel(null);
      setTalking(true);
      play("talk");
      track("ghost_tenth_click");
    } else {
      const trick = TRICK_ORDER[next - 1];
      setLabel(trick);
      play(trick);
      track("ghost_trick", { name: trick });
    }
  }, [clicks, entered, painting, play, talking, wake]);

  const hush = useCallback(() => {
    setTalking(false);
    setClicks(0);
    setLabel(null);
    play(null);
    // After the first full round, let them in on the secret
    setPaintHint(true);
  }, [play]);

  const stopPainting = useCallback(() => {
    setPainting(false);
    wake();
  }, [wake]);

  // Two quick taps on the empty white wall (not the ghost, not a button) starts paint mode
  const onWallTap = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!entered || talking || painting) return;
      if ((e.target as HTMLElement).closest("button, a, form, [data-ui]")) return;
      const now = performance.now();
      if (now - lastWallTap.current < DOUBLE_TAP_MS) {
        lastWallTap.current = 0;
        setPainting(true);
        setPaintHint(false);
        setLabel(null);
        track("paint_mode");
      } else lastWallTap.current = now;
    },
    [entered, painting, talking],
  );

  const caption = label ?? MOOD_LABEL[mood] ?? (talking ? "" : "Poke him");

  return (
    <section
      aria-label="The Miracle Ghost"
      onPointerDown={onWallTap}
      className="relative h-[100dvh] w-full overflow-hidden bg-background [container-type:size]"
    >
      <h1 className="sr-only">The Miracle Ghost</h1>
      <p className="sr-only">
        The Miracle Ghost is the street artist Aes, from Miami. Click his ghost to enter, then visit the Shop for original
        paintings and drops, Shows for exhibitions and murals, and Contact for commissions.
      </p>

      {/* The still ghost shows at once; the 3D one fades in over it when it is ready */}
      <GhostPoster visible={!ready} scale={entered ? 0.92 : 1} y={entered ? -0.3 : 0} priority />

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
        onReady={() => setReady(true)}
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
        {mood === "asleep" && !talking && !painting && (
          <motion.div
            key="zzz"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-1/2 top-[30%] ml-[min(9dvh,18vw)] font-drip text-foreground"
          >
            {["z", "Z", "Z"].map((z, i) => (
              <motion.span
                key={i}
                className="absolute block"
                style={{ fontSize: `${1.4 + i * 0.7}rem` }}
                initial={{ opacity: 0, x: 0, y: 0 }}
                animate={reducedMotion ? { opacity: 1, x: i * 18, y: -i * 26 } : { opacity: [0, 1, 1, 0], x: [0, 10 + i * 14, 18 + i * 18], y: [0, -30 - i * 18, -70 - i * 26] }}
                transition={reducedMotion ? { duration: 0.3 } : { duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
              >
                {z}
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {talking && <SpeechBubble onDone={hush} />}
      </AnimatePresence>

      <AnimatePresence>{painting && <PaintWall onExit={stopPainting} />}</AnimatePresence>

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
                {painting ? "" : caption}
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
              <AnimatePresence>
                {paintHint && !painting && !talking && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 1.2 }}
                    className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/45"
                  >
                    psst… double-tap the wall
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
