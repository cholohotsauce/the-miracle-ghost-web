"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import GhostPoster from "@/components/ghost/GhostPoster";
import type { TrickName } from "@/components/ghost/tricks";
import type { GhostState } from "@/components/ghost/types";
import { useGhostEvents } from "@/lib/ghostBus";
import { track } from "@/lib/stats";
import { useIdleMood, type Mood } from "@/lib/useIdleMood";

const GhostStage = dynamic(() => import("@/components/ghost/GhostStage"), { ssr: false });

/** Tricks small enough to stay inside the mini ghost's box */
const POKE_TRICKS: TrickName[] = ["spin", "squash", "grin pop", "boing", "boo", "neon", "annoyed shake", "backflip"];

const SAY_MS = 2_400;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * The ghost keeps you company on every page except Home (where the big ghost lives).
 * He watches the cursor and the products you look at, cheers when something goes in the cart,
 * sulks when the cart is emptied, and gets bored and falls asleep like the big one.
 */
export default function MiniGhost() {
  const pathname = usePathname();
  const hidden = pathname === "/";
  const reducedMotion = useReducedMotion() ?? false;
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  // While someone types in a form, he ducks out of the way
  const [typing, setTyping] = useState(false);
  const sayTimer = useRef<number | undefined>(undefined);
  const lookAt = useRef<{ x: number; y: number } | null>(null);
  const controls = useRef<GhostState>({
    entered: true,
    tilt: { x: 0, y: 0 },
    trick: { name: null, seq: 0 },
    reducedMotion: false,
  });

  useEffect(() => {
    controls.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  const play = useCallback((name: TrickName | null) => {
    controls.current.trick = { name, seq: controls.current.trick.seq + 1 };
  }, []);

  const say = useCallback((text: string | null) => {
    window.clearTimeout(sayTimer.current);
    setLine(text);
    if (text) sayTimer.current = window.setTimeout(() => setLine(null), SAY_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(sayTimer.current), []);

  const { mood, wake } = useIdleMood({
    paused: hidden,
    onMood: useCallback(
      (m: Mood) => {
        if (m === "bored") play("bored");
        else if (m === "yawn") play("yawn");
        else if (m === "asleep") {
          play("sleep");
          say(null);
        } else play(null);
      },
      [play, say],
    ),
  });

  // Eyes on the cursor, or on the product being looked at, measured from where the ghost sits
  const aim = useCallback((x: number, y: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    controls.current.tilt.x = clamp(((x - cx) / window.innerWidth) * 2.2);
    controls.current.tilt.y = clamp(-((y - cy) / window.innerHeight) * 2.2);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const onPointer = (e: PointerEvent) => {
      if (!lookAt.current) aim(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, [aim, hidden]);

  useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && t.matches("input, textarea, select");
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  // A little hello on each new page
  useEffect(() => {
    if (hidden) return;
    wake();
    play("grin");
  }, [pathname, hidden, play, wake]);

  useGhostEvents((event) => {
    if (hidden) return;
    switch (event.type) {
      case "cart-add":
        wake();
        play("backflip");
        say("Good taste.");
        break;
      case "cheer":
        wake();
        play("boing");
        say(event.line ?? null);
        break;
      case "cart-empty":
        wake();
        play("annoyed shake");
        say("Really?");
        break;
      case "welcome-back":
        if (mood === "asleep") return;
        play("grin pop");
        say("Missed me?");
        break;
      case "look":
        lookAt.current = { x: event.x, y: event.y };
        aim(event.x, event.y);
        break;
      case "look-away":
        lookAt.current = null;
        break;
    }
  });

  const poke = useCallback(() => {
    track("mini_ghost_poke");
    if (wake() === "asleep") {
      play("waking");
      say("I was sleeping.");
      return;
    }
    play(POKE_TRICKS[Math.floor(Math.random() * POKE_TRICKS.length)]);
  }, [play, say, wake]);

  if (hidden) return null;

  return (
    // On phones he peeks up from the bottom edge so he never covers the page, and rises when he has something to say
    <div
      className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)-0.75rem)] -left-2 z-40 transition-transform duration-500 ease-out md:bottom-0 md:left-2 ${
        typing ? "translate-y-full" : line ? "translate-y-0" : "max-md:translate-y-[42%]"
      }`}
    >
      <AnimatePresence>
        {(line || mood === "asleep") && (
          <motion.p
            key={line ?? "zzz"}
            role="status"
            initial={{ opacity: 0, y: 6, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            className={`absolute bottom-[78%] left-[62%] whitespace-nowrap rounded-full border-2 border-foreground bg-background px-2.5 py-1 text-sm leading-none md:text-base ${
              line ? "font-drip uppercase" : "font-round text-[var(--color-sleepy-blue)]"
            }`}
          >
            {line ?? "z Z Z"}
          </motion.p>
        )}
      </AnimatePresence>
      <div ref={box} className="relative h-36 w-28 [container-type:size] md:h-48 md:w-40">
        <GhostPoster visible={!ready} scale={0.92} y={-0.3} />
        <GhostStage
          controls={controls}
          reducedMotion={reducedMotion}
          onPoke={poke}
          onReady={() => setReady(true)}
          dpr={[1, 1.5]}
          className="!absolute inset-0"
        />
        <button
          type="button"
          onClick={poke}
          aria-label="Poke the little ghost"
          className="pointer-events-auto absolute inset-x-[18%] inset-y-[16%] cursor-pointer rounded-[45%] focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-foreground"
        />
      </div>
    </div>
  );
}
