"use client";

import { useEffect } from "react";

const AWAY = "👻 Ghosted you…";

/**
 * When a visitor switches to another browser tab, this tab's title changes to a little "ghosted you",
 * and it goes back to the real page title the moment they return (Round 5b polish).
 */
export default function TabGhost() {
  useEffect(() => {
    let real = "";
    const onChange = () => {
      if (document.hidden) {
        if (document.title !== AWAY) real = document.title;
        document.title = AWAY;
      } else if (document.title === AWAY && real) {
        document.title = real;
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => {
      document.removeEventListener("visibilitychange", onChange);
      if (document.title === AWAY && real) document.title = real;
    };
  }, []);

  return null;
}
