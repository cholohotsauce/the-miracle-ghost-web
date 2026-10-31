"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Gap between items that come into view together, and the most any one item waits */
const STEP_MS = 70;
const MAX_DELAY_MS = 420;

/**
 * Runs the site's scroll reveals (see "Motion system" in app/globals.css).
 * Watches every [data-reveal] element and adds .is-in when it scrolls into view.
 * While the page curtain is still covering the screen, it holds the reveals back
 * and lets them play as the curtain lifts, so they are seen and not wasted under it.
 */
export default function Reveal() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const held = new Set<HTMLElement>();
    const covered = () => root.dataset.curtain === "cover" || root.dataset.curtain === "wait";

    const show = (els: HTMLElement[]) => {
      let n = 0;
      for (const el of els) {
        if (el.dataset.reveal === "item") {
          el.style.setProperty("--reveal-delay", `${Math.min(n * STEP_MS, MAX_DELAY_MS)}ms`);
          n += 1;
        }
        el.classList.add("is-in");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const now: HTMLElement[] = [];
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          io.unobserve(el);
          if (covered()) held.add(el);
          else now.push(el);
        }
        // Top to bottom, left to right, so a row of cards fills in reading order
        now.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return ra.top - rb.top || ra.left - rb.left;
        });
        show(now);
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const watch = () => {
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)").forEach((el) => io.observe(el));
    };
    watch();

    // New content (another page, a product grid that loads late) gets watched too
    let frame = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(watch);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    const onCurtainLift = () => {
      const els = [...held];
      held.clear();
      show(els);
    };
    window.addEventListener("curtain-lift", onCurtainLift);

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("curtain-lift", onCurtainLift);
    };
  }, [pathname]);

  return null;
}
