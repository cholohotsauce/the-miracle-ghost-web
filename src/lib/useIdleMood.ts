"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Mood = "awake" | "bored" | "yawn" | "asleep";

/** Seconds of nobody touching anything before each mood starts */
export const MOOD_AFTER: Record<Exclude<Mood, "awake">, number> = {
  bored: 15,
  yawn: 24,
  asleep: 26.6,
};

const ACTIVITY = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;

/**
 * The ghost's idle moods. Leave the page alone and he gets bored, yawns, then falls asleep.
 * Moving the mouse or touching the page resets the clock until he is asleep;
 * once asleep, only a click on him (`wake`) wakes him up.
 * `paused` stops the clock, for example while the speech bubble is open.
 */
export function useIdleMood({ paused, onMood }: { paused: boolean; onMood: (mood: Mood) => void }) {
  const [mood, setMood] = useState<Mood>("awake");
  const moodRef = useRef<Mood>("awake");
  const last = useRef(0);
  const onMoodRef = useRef(onMood);
  useEffect(() => {
    onMoodRef.current = onMood;
  });

  const change = useCallback((next: Mood) => {
    if (moodRef.current === next) return;
    moodRef.current = next;
    setMood(next);
    onMoodRef.current(next);
  }, []);

  useEffect(() => {
    last.current = performance.now();
    const onActivity = () => {
      if (moodRef.current === "asleep") return;
      last.current = performance.now();
      if (moodRef.current !== "awake") change("awake");
    };
    for (const name of ACTIVITY) window.addEventListener(name, onActivity, { passive: true });
    return () => {
      for (const name of ACTIVITY) window.removeEventListener(name, onActivity);
    };
  }, [change]);

  useEffect(() => {
    if (paused) {
      last.current = performance.now();
      return;
    }
    const id = window.setInterval(() => {
      if (document.hidden || moodRef.current === "asleep") return;
      const idle = (performance.now() - last.current) / 1000;
      const next: Mood =
        idle >= MOOD_AFTER.asleep ? "asleep" : idle >= MOOD_AFTER.yawn ? "yawn" : idle >= MOOD_AFTER.bored ? "bored" : "awake";
      if (next !== moodRef.current) change(next);
    }, 250);
    return () => window.clearInterval(id);
  }, [paused, change]);

  /** Wakes him (or just resets the clock). Returns the mood he was in. */
  const wake = useCallback(() => {
    const was = moodRef.current;
    last.current = performance.now();
    moodRef.current = "awake";
    setMood("awake");
    return was;
  }, []);

  return { mood, wake };
}
