"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";
const RUN_MS = 520;

/**
 * Small labels marked data-scramble flicker through random characters and settle into their word
 * when they first come into view, like a bad TV signal finding the channel (Round 5b polish).
 * Only the label's own text changes, letter by letter from the left, and only once per page view.
 * Skipped with reduce motion. The real word is back within half a second.
 */
export default function Scramble() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frames = new Set<number>();

    const run = (el: HTMLElement) => {
      const node = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.nodeValue?.trim());
      if (!node || !node.nodeValue) return;
      const word = node.nodeValue;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / RUN_MS);
        const settled = Math.floor(t * word.length);
        let out = "";
        for (let i = 0; i < word.length; i++) {
          const c = word[i];
          out += i < settled || c === " " || c === "." ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        node.nodeValue = t < 1 ? out : word;
        if (t < 1) frames.add(requestAnimationFrame(tick));
      };
      frames.add(requestAnimationFrame(tick));
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          // Wait for the page curtain, like the scroll reveals do
          const el = e.target as HTMLElement;
          const covered = () => ["cover", "wait"].includes(document.documentElement.dataset.curtain ?? "");
          if (covered()) window.addEventListener("curtain-lift", () => run(el), { once: true });
          else run(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const watch = () => document.querySelectorAll<HTMLElement>("[data-scramble]:not([data-scrambled])").forEach((el) => {
      el.dataset.scrambled = "";
      io.observe(el);
    });
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      frames.forEach(cancelAnimationFrame);
    };
  }, [pathname]);

  return null;
}
