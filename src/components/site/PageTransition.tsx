"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion, type Transition } from "framer-motion";

/**
 * Page changes as a coat of black spray paint: the paint runs down over the page with a sagging,
 * dripping edge, the next page loads behind it, and the paint keeps sliding down to reveal it
 * while its drips stretch and run ahead (reworked for Aes, 2026-10-20).
 * Links opt in through TransitionLink. Browser back and forward stay instant.
 */

type Phase = "idle" | "cover" | "wait" | "reveal";

const Ctx = createContext<{ navigate: (href: string, label?: string) => void } | null>(null);

export const useTransitionNav = () => useContext(Ctx);

/** Deterministic scatter in [0, 1) so server and client agree */
const rand = (i: number, salt: number) => {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Drips along the bottom edge: [x as % of width, length in px, width in px, how fast it runs].
 * Each one sags while the paint comes down, then keeps running as the paint slides off.
 */
const DRIPS: [number, number, number, number][] = [
  [3, 52, 10, 0.8],
  [9, 128, 15, 1.15],
  [16, 34, 9, 0.7],
  [23, 86, 12, 1],
  [31, 164, 17, 1.25],
  [38, 44, 8, 0.75],
  [45, 104, 13, 1.05],
  [53, 28, 9, 0.65],
  [59, 146, 16, 1.2],
  [67, 60, 10, 0.9],
  [74, 118, 14, 1.1],
  [82, 38, 8, 0.7],
  [89, 96, 12, 1],
  [96, 48, 9, 0.8],
];

/** A wavy lip of paint: smooth bumps between heights `lo` and `hi` in a 100 x 20 box */
function lip(salt: number, lo: number, hi: number, down: boolean) {
  const n = 18;
  const pts = Array.from({ length: n + 1 }, (_, i) => [(i / n) * 100, lo + rand(i, salt) * (hi - lo)] as const);
  const y = (v: number) => (down ? v : 20 - v);
  let d = `M0 ${y(0)} L0 ${y(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` Q${x0 + (x1 - x0) / 2} ${y(y0 + y1 > hi + lo ? Math.max(y0, y1) : Math.min(y0, y1))} ${x1} ${y(y1)}`;
  }
  return `${d} L100 ${y(0)} Z`;
}
const BOTTOM_LIP = lip(1, 3, 15, true);
const TOP_LIP = lip(2, 2, 12, false);

/** Overspray specks on the top edge: [x %, y px above the edge, radius px] */
const SPECKS: [number, number, number][] = Array.from({ length: 70 }, (_, i) => {
  const fy = rand(i, 3);
  return [rand(i, 4) * 100, 10 + fy * fy * 70, 1 + ((i * 7) % 5) * 0.7];
});

const EASE = [0.65, 0, 0.35, 1] as const;
const COVER: Transition = { duration: 0.55, ease: EASE };
const REVEAL: Transition = { duration: 0.8, ease: EASE };
/** Give up waiting for a slow page and reveal anyway */
const MAX_WAIT_MS = 6_000;

function PaintCurtain({ phase, label, onCovered, onRevealed }: {
  phase: Phase;
  label: string;
  onCovered: () => void;
  onRevealed: () => void;
}) {
  const reduced = useReducedMotion();
  // Off screen above (drips and all), covering, then off screen below (specks and all)
  const y = phase === "idle" ? "-140%" : phase === "reveal" ? "140%" : "0%";
  const covering = phase === "cover" || phase === "wait";

  if (reduced) {
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] bg-foreground"
        initial={false}
        animate={{ opacity: covering ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onAnimationComplete={() => (phase === "cover" ? onCovered() : phase === "reveal" ? onRevealed() : undefined)}
      />
    );
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[100lvh]"
      initial={false}
      animate={{ y }}
      transition={phase === "idle" ? { duration: 0 } : phase === "reveal" ? REVEAL : COVER}
      onAnimationComplete={() => (phase === "cover" ? onCovered() : phase === "reveal" ? onRevealed() : undefined)}
      style={{ visibility: phase === "idle" ? "hidden" : "visible" }}
    >
      {/* Overspray and a ragged top edge above the paint, seen as it slides off */}
      <svg className="absolute bottom-full left-0 h-24 w-full" preserveAspectRatio="none" viewBox="0 0 100 96">
        {SPECKS.map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={96 - y} rx={r * 0.12} ry={r} className="fill-foreground" />
        ))}
      </svg>
      <svg className="absolute bottom-[calc(100%-1px)] left-0 h-5 w-full" preserveAspectRatio="none" viewBox="0 0 100 20">
        <path d={TOP_LIP} className="fill-foreground" />
      </svg>
      <div className="flex h-full w-full items-center justify-center bg-foreground">
        <motion.span
          className="font-drip text-[clamp(3rem,14vw,9rem)] uppercase leading-none text-background"
          initial={false}
          animate={covering ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 1.12, filter: "blur(10px)" }}
          transition={covering ? { duration: 0.45, delay: 0.25, ease: "easeOut" } : { duration: 0.25 }}
        >
          {label}
        </motion.span>
      </div>
      {/* The sagging bottom edge, with drips running ahead of the paint */}
      <svg className="absolute left-0 top-[calc(100%-1px)] h-6 w-full" preserveAspectRatio="none" viewBox="0 0 100 20">
        <path d={BOTTOM_LIP} className="fill-foreground" />
      </svg>
      <div className="absolute left-0 top-full h-64 w-full">
        {DRIPS.map(([x, len, w, speed], i) => (
          <motion.div
            key={i}
            className="absolute top-[-2px] flex flex-col items-center"
            style={{ left: `${x}%`, width: w * 1.5, marginLeft: -w * 0.75 }}
            initial={false}
            animate={{ height: phase === "idle" ? len * 0.3 : phase === "reveal" ? len * (1.3 + speed * 0.5) : len }}
            transition={
              phase === "idle"
                ? { duration: 0 }
                : phase === "reveal"
                  ? { duration: REVEAL.duration, ease: "easeIn" }
                  : { duration: 0.45 + 0.35 / speed, delay: 0.1 * rand(i, 5), ease: [0.3, 0.7, 0.4, 1] }
            }
          >
            {/* The run of paint, thinning toward a round bead at its tip */}
            <span className="w-full flex-1 bg-foreground" style={{ width: w, clipPath: "polygon(0 0, 100% 0, 82% 100%, 18% 100%)" }} />
            <span className="-mt-px shrink-0 rounded-full bg-foreground" style={{ width: w * 1.15, height: w * 1.35 }} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const [label, setLabel] = useState("");
  const target = useRef<{ href: string; from: string } | null>(null);

  const navigate = useCallback(
    (href: string, nextLabel?: string) => {
      if (phase !== "idle") return;
      target.current = { href, from: pathname };
      setLabel(nextLabel ?? "");
      router.prefetch(href);
      setPhase("cover");
    },
    [phase, pathname, router],
  );

  const onCovered = useCallback(() => {
    const t = target.current;
    if (!t) return setPhase("reveal");
    setPhase("wait");
    router.push(t.href);
    window.scrollTo(0, 0);
  }, [router]);

  // The new page is in once the path changes
  useEffect(() => {
    if (phase === "wait" && target.current && pathname !== target.current.from) {
      const id = requestAnimationFrame(() => setPhase("reveal"));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname, phase]);

  useEffect(() => {
    if (phase !== "wait") return;
    const t = setTimeout(() => setPhase("reveal"), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  const onRevealed = useCallback(() => {
    target.current = null;
    setPhase("idle");
  }, []);

  const value = useMemo(() => ({ navigate }), [navigate]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <PaintCurtain phase={phase} label={label} onCovered={onCovered} onRevealed={onRevealed} />
    </Ctx.Provider>
  );
}
