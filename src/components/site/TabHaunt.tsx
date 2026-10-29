"use client";

import { useEffect } from "react";
import { emitGhost } from "@/lib/ghostBus";

/**
 * Come back to the tab and the ghost reacts. The tab title never changes: Aes wants only the favicon
 * and "The Miracle Ghost" in the tab at all times (2026-10-22), so no "come back" titles.
 */
export default function TabHaunt() {
  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) emitGhost({ type: "welcome-back" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return null;
}
