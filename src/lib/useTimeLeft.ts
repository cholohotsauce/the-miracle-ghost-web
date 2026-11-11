"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Milliseconds left until `to`, ticking in the browser, shared by every countdown on the site.
 * - null until the browser's clock is read, so the server render and the first paint match.
 * - `onZero` runs once when zero is reached with the page open. A time already past on arrival does not
 *   trigger it: a held teaser or a page cached a moment too long would otherwise reload forever.
 */
export function useTimeLeft(to: number, onZero: () => void, tickMs = 1_000) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = requestAnimationFrame(tick);
    const id = window.setInterval(tick, tickMs);
    return () => {
      cancelAnimationFrame(first);
      window.clearInterval(id);
    };
  }, [tickMs]);

  const left = now === null ? null : Math.max(0, to - now);

  const wasCounting = useRef(false);
  const zero = useRef(onZero);
  useEffect(() => {
    zero.current = onZero;
  });
  useEffect(() => {
    if (left === null) return;
    if (left > 0) {
      wasCounting.current = true;
      return;
    }
    if (!wasCounting.current) return;
    wasCounting.current = false;
    const id = window.setTimeout(() => zero.current(), 1_500);
    return () => window.clearTimeout(id);
  }, [left]);

  return left;
}
