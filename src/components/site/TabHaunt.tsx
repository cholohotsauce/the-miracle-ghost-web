"use client";

import { useEffect } from "react";
import { emitGhost } from "@/lib/ghostBus";

const AWAY_TITLES = ["👻 come back…", "👻 i see you", "👻 come back…", "👻 boo"];
/** Seconds between title changes while the tab is in the background */
const STEP_MS = 2_500;

/**
 * Leave the tab and its title starts calling you back. Return and the ghost reacts.
 * Browsers slow timers in background tabs, so the title may change less often than STEP_MS.
 */
export default function TabHaunt() {
  useEffect(() => {
    let saved: string | null = null;
    let timer: number | undefined;

    const onVisibility = () => {
      if (document.hidden) {
        saved = document.title;
        let i = 0;
        document.title = AWAY_TITLES[0];
        timer = window.setInterval(() => {
          i = (i + 1) % AWAY_TITLES.length;
          document.title = AWAY_TITLES[i];
        }, STEP_MS);
      } else {
        window.clearInterval(timer);
        if (saved !== null) document.title = saved;
        saved = null;
        emitGhost({ type: "welcome-back" });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(timer);
      if (saved !== null) document.title = saved;
    };
  }, []);

  return null;
}
