"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GhostPoster from "./ghost/GhostPoster";
import PaintWall from "./PaintWall";
import SpeechBubble from "./SpeechBubble";
import {
  CLICKS_PER_CYCLE,
  TALK_LEAD,
  TRICK_DURATION,
  TRICK_ORDER,
  type TrickName,
} from "./ghost/tricks";
import type { GhostState } from "./ghost/types";
import { setEntered, useEntered } from "@/lib/entry";
import { useGhostEvents } from "@/lib/ghostBus";
import { track } from "@/lib/stats";
import { useIdleMood, type Mood } from "@/lib/useIdleMood";

// three.js and the model load after the page shows; the still poster covers the gap
const GhostStage = dynamic(() => import("./ghost/GhostStage"), { ssr: false });

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/** Two taps on the empty wall within this many ms opens paint mode */
const DOUBLE_TAP_MS = 450;

/**
 * What screen readers hear for tricks whose names don't read well on their own.
 * Aes asked for no expression names on the page (2026-10-19), so these are never shown.
 */
const TRICK_CAPTION: Partial<Record<TrickName, string>> = {
  fire: "too hot",
  attitude: "grin",
  neon: "color play",
};

/** After a tap on a phone, the ghost keeps looking there this long before drifting back to center */
const TOUCH_LOOK_MS = 1600;


/** What screen readers hear for each idle mood */
const MOOD_LABEL: Record<Mood, string | null> = {
  awake: null,
  bored: "bored…",
  yawn: "yaaawn",
  asleep: "shh. he's asleep",
};

/** A small spray can with a puff of neon mist */
function SprayCan() {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <rect x="7" y="12" width="12" height="17" rx="2.5" />
      <path d="M9.5 12V9.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V12" />
      <rect x="11" y="4" width="4" height="4" rx="1" />
      <path d="M7 17h12" />
      <circle cx="22.5" cy="5" r="1.3" fill="var(--color-neon-green)" stroke="none" />
      <circle cx="26" cy="3.5" r="1" fill="var(--color-neon-pink)" stroke="none" />
      <circle cx="25.5" cy="7.5" r="1.2" fill="var(--color-neon-teal)" stroke="none" />
      <circle cx="28.5" cy="6" r="0.8" fill="var(--color-neon-green)" stroke="none" />
    </svg>
  );
}

/**
 * Aes's landing: a white page with only his ghost.
 * Click 1 enters (grin + menu). Clicks 1–9 after that play tricks while his patience bar runs down.
 * Click 10 opens the speech bubble.
 * Leave him alone and he gets bored, yawns, and falls asleep; wake him and he opens his eyes, back to his old self.
 * The spray can in the corner (or a double-tap on the empty wall) lets you spray paint on the wall.
 */
/**
 * The patience line's color for a poke count (Aes, 2026-10-20): toxic green from the first poke,
 * orange once the fire ghost shows up, then on toward red, reached on the tenth poke.
 */
const PATIENCE_GREEN = [0x39, 0xff, 0x14]; // --color-neon-green
const PATIENCE_ORANGE = [0xff, 0x8a, 0x00];
const PATIENCE_RED = [0xe1, 0x0b, 0x1f]; // --color-drip-red
const FIRE_CLICK = TRICK_ORDER.indexOf("fire") + 1;

function patienceColor(clicks: number) {
  if (clicks < FIRE_CLICK) return rgb(PATIENCE_GREEN);
  const t = (clicks - FIRE_CLICK) / (CLICKS_PER_CYCLE - FIRE_CLICK);
  return rgb(PATIENCE_ORANGE.map((c, i) => c + (PATIENCE_RED[i] - c) * t));
}

const rgb = (c: number[]) => `rgb(${c.map(Math.round).join(", ")})`;

export default function GhostLanding() {
  const reducedMotion = useReducedMotion() ?? false;
  const entered = useEntered();
  const [clicks, setClicks] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const [talking, setTalking] = useState(false);
  const [bubble, setBubble] = useState(false);
  const fxTimers = useRef<number[]>([]);
  const [painting, setPainting] = useState(false);
  const [paintHint, setPaintHint] = useState(false);
  const [ready, setReady] = useState(false);
  const lastWallTap = useRef(0);
  const labelTimer = useRef<number | undefined>(undefined);
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

  // The cursor steers the ghost. On phones he follows your finger instead, then drifts back to center.
  // Phones that share tilt without asking (Android) can steer him by tilting too. iPhones only share tilt
  // after a permission popup, so the site never asks for it.
  useEffect(() => {
    let tilt = false;
    let neutralBeta: number | null = null;
    let release: number | undefined;

    const onPointer = (e: PointerEvent) => {
      if (tilt) return;
      window.clearTimeout(release);
      controls.current.tilt.x = clamp((e.clientX / window.innerWidth) * 2 - 1);
      controls.current.tilt.y = clamp(-((e.clientY / window.innerHeight) * 2 - 1));
    };

    const onTouchEnd = (e: PointerEvent) => {
      if (tilt || e.pointerType !== "touch") return;
      window.clearTimeout(release);
      release = window.setTimeout(() => {
        controls.current.tilt.x = 0;
        controls.current.tilt.y = 0;
      }, TOUCH_LOOK_MS);
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
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", onTouchEnd, { passive: true });
    window.addEventListener("pointercancel", onTouchEnd, { passive: true });
    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.clearTimeout(release);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onTouchEnd);
      window.removeEventListener("pointercancel", onTouchEnd);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    fxTimers.current.push(window.setTimeout(fn, ms));
  }, []);
  const clearLater = useCallback(() => {
    for (const id of fxTimers.current) window.clearTimeout(id);
    fxTimers.current = [];
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(labelTimer.current);
      clearLater();
    },
    [clearLater],
  );

  const say = useCallback((text: string | null) => {
    window.clearTimeout(labelTimer.current);
    setLabel(text);
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
          // Moving the mouse snaps him out of a bored spell, and anything that wakes him ends the nap
          const name = controls.current.trick.name;
          if (name === "bored" || name === "yawn" || name === "sleep") play(null);
          return;
        }
        say(null);
        play(m === "asleep" ? "sleep" : m);
      },
      [play, say],
    ),
  });

  useGhostEvents((event) => {
    if (event.type !== "welcome-back" || talking || painting || mood === "asleep") return;
    wake();
    say("missed me?");
    play("curious");
  });

  const poke = useCallback(() => {
    if (talking || painting) return;
    // A sleeping ghost wakes up, and that poke doesn't count
    if (wake() === "asleep" && entered) {
      say("huh…?");
      play("waking");
      labelTimer.current = window.setTimeout(() => setLabel(null), TRICK_DURATION.waking * 1000);
      track("ghost_woke_up");
      return;
    }
    if (!entered) {
      setEntered(true);
      setClicks(0);
      say("grin");
      play("grin");
      track("ghost_enter");
      return;
    }
    const next = clicks + 1;
    setClicks(next);
    clearLater();
    if (next >= CLICKS_PER_CYCLE) {
      // Out of patience: he shakes with a scowl first, then the bubble opens
      say("that's it.");
      setTalking(true);
      play("talk");
      later(TALK_LEAD * 1000, () => {
        say(null);
        setBubble(true);
      });
      track("ghost_tenth_click");
    } else {
      const trick = TRICK_ORDER[next - 1];
      say(TRICK_CAPTION[trick] ?? trick);
      play(trick);
      track("ghost_trick", { name: trick });
    }
  }, [say, clicks, clearLater, entered, later, painting, play, talking, wake]);

  const hush = useCallback(() => {
    setTalking(false);
    setBubble(false);
    setClicks(0);
    say(null);
    play(null);
    // After the first full round, the spray can wiggles to let them in on the secret
    setPaintHint(true);
  }, [play, say]);

  const stopPainting = useCallback(() => {
    setPainting(false);
    wake();
  }, [wake]);

  const startPainting = useCallback(
    (how: "spray can" | "double-tap") => {
      setPainting(true);
      setPaintHint(false);
      say(null);
      track("paint_mode", { how });
    },
    [say],
  );

  // Two quick taps on the empty white wall (not the ghost, not a button) starts paint mode
  const onWallTap = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (!entered || talking || painting) return;
      if ((e.target as HTMLElement).closest("button, a, form, [data-ui]")) return;
      const now = performance.now();
      if (now - lastWallTap.current < DOUBLE_TAP_MS) {
        lastWallTap.current = 0;
        startPainting("double-tap");
      } else lastWallTap.current = now;
    },
    [entered, painting, startPainting, talking],
  );

  // Read out to screen readers only: Aes wants no expression names under the ghost
  const caption = label ?? MOOD_LABEL[mood] ?? "";
  // His impatience: empty when you arrive, full on the tenth poke (Aes, 2026-10-19)
  const impatience = clicks / CLICKS_PER_CYCLE;

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

      <GhostStage
        controls={controls}
        reducedMotion={reducedMotion}
        onPoke={poke}
        onReady={() => setReady(true)}
        fallback={
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.2em]">
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
            className="pointer-events-none absolute left-1/2 top-[30%] ml-[min(9dvh,18vw)] font-round text-[var(--color-sleepy-blue)]"
          >
            {["z", "Z", "Z"].map((z, i) => (
              <motion.span
                key={i}
                className="absolute block leading-none"
                style={{ fontSize: `${1.9 + i * 0.9}rem` }}
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
        {bubble && <SpeechBubble onDone={hush} />}
      </AnimatePresence>

      <AnimatePresence>{painting && <PaintWall onExit={stopPainting} />}</AnimatePresence>

      <AnimatePresence>
        {entered && !painting && !talking && (
          <motion.button
            key="spray"
            type="button"
            data-ui
            onClick={() => startPainting("spray can")}
            aria-label="Spray paint the wall"
            title="Spray paint the wall"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={paintHint && !reducedMotion ? { opacity: 1, scale: 1, rotate: [0, -14, 12, -8, 0] } : { opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={
              paintHint && !reducedMotion
                ? { rotate: { duration: 0.7, repeat: Infinity, repeatDelay: 2.2 }, default: { duration: 0.3 } }
                : { duration: 0.3, delay: 0.6 }
            }
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.25rem)] right-4 z-10 grid h-11 w-11 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-foreground md:bottom-8 md:right-8"
          >
            <SprayCan />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] md:pb-10">
        {/* Only the ghost before the menu, and only the ghost, his patience and the spray can after it (Aes, 2026-10-20) */}
        <AnimatePresence initial={false}>
          {entered && (
            <motion.div
              key="mascot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className={`flex flex-col items-center transition-opacity ${painting ? "opacity-0" : ""}`}
            >
              <p aria-live="polite" className="sr-only">
                {painting ? "" : caption}
              </p>
              {/* His patience, with no words: the line fills with every poke and he snaps when it's full */}
              <motion.div
                role="meter"
                aria-label="The ghost's patience"
                aria-valuemin={0}
                aria-valuemax={CLICKS_PER_CYCLE}
                aria-valuenow={CLICKS_PER_CYCLE - clicks}
                key={clicks}
                animate={!reducedMotion && clicks >= 6 ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
                transition={{ duration: 0.35 }}
                className="h-2.5 w-36 overflow-hidden rounded-full border-2 border-foreground bg-background p-px md:w-44"
              >
                <motion.div
                  initial={false}
                  animate={{ scaleX: impatience, backgroundColor: patienceColor(clicks) }}
                  transition={{ scaleX: { type: "spring", stiffness: 260, damping: 24 }, backgroundColor: { duration: 0.4 } }}
                  className="h-full w-full origin-left rounded-full"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
