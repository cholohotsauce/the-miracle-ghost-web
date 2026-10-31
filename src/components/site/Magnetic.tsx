"use client";

import { useEffect } from "react";

/** How near the mouse has to come, in pixels past the button's edge, and how far the button follows it */
const REACH = 70;
const PULL = 0.28;
const MAX_SHIFT = 10;

/**
 * Round buttons marked data-magnetic lean a few pixels toward the mouse when it comes near
 * (Round 4 polish). Desktop mice only; nothing happens on touch screens or with reduce motion.
 * The lean uses the CSS `translate` property, so it never fights a button's own transform.
 */
export default function Magnetic() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || still.matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const leaning = new Set<HTMLElement>();

    const update = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const near = Math.abs(dx) < r.width / 2 + REACH && Math.abs(dy) < r.height / 2 + REACH;
        if (near) {
          const clamp = (v: number) => Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, v * PULL));
          el.style.translate = `${clamp(dx)}px ${clamp(dy)}px`;
          leaning.add(el);
        } else if (leaning.has(el)) {
          el.style.translate = "";
          leaning.delete(el);
        }
      });
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
      leaning.forEach((el) => (el.style.translate = ""));
    };
  }, []);

  return null;
}
