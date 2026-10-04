"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion, type Transition } from "framer-motion";

/**
 * Page changes as a coat of black spray paint: the paint drips down over the page,
 * the next page loads behind it, and the paint keeps sliding down to reveal it.
 * Links opt in through TransitionLink. Browser back and forward stay instant.
 */

type Phase = "idle" | "cover" | "wait" | "reveal";

const Ctx = createContext<{ navigate: (href: string, label?: string) => void } | null>(null);

export const useTransitionNav = () => useContext(Ctx);

/** Drips along the bottom edge: [x as % of width, length in px, width in px] */
const DRIPS: [number, number, number][] = [
  [4, 46, 10],
  [11, 112, 14],
  [19, 30, 9],
  [27, 78, 12],
  [36, 140, 16],
  [44, 40, 8],
  [52, 96, 13],
  [61, 26, 9],
  [68, 128, 15],
  [77, 54, 10],
  [85, 104, 13],
  [93, 36, 9],
];

/** Overspray specks on the top edge: [x %, y px above the edge, radius px] */
const SPECKS: [number, number, number][] = Array.from({ length: 70 }, (_, i) => {
  // Deterministic scatter so server and client agree
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.123;
  const fx = a - Math.floor(a);
  const fy = b - Math.floor(b);
  return [fx * 100, 4 + fy * fy * 70, 1 + ((i * 7) % 5) * 0.7];
});

const COVER: Transition = { duration: 0.5, ease: [0.65, 0, 0.35, 1] };
const REVEAL: Transition = { duration: 0.75, ease: [0.65, 0, 0.35, 1] };
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
  const y = phase === "idle" ? "-130%" : phase === "reveal" ? "130%" : "0%";

  if (reduced) {
    return (
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[70] bg-foreground"
        initial={false}
        animate={{ opacity: phase === "cover" || phase === "wait" ? 1 : 0 }}
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
      {/* Overspray above the paint */}
      <svg className="absolute bottom-full left-0 h-20 w-full" preserveAspectRatio="none" viewBox="0 0 100 80">
        {SPECKS.map(([x, y, r], i) => (
          <ellipse key={i} cx={x} cy={80 - y} rx={r * 0.12} ry={r} className="fill-foreground" />
        ))}
      </svg>
      <div className="flex h-full w-full items-center justify-center bg-foreground">
        <span className="font-drip text-[clamp(3rem,14vw,9rem)] uppercase leading-none text-background">{label}</span>
      </div>
      {/* Drips running ahead of the paint */}
      <div className="absolute left-0 top-full h-40 w-full">
        {DRIPS.map(([x, len, w], i) => (
          <span
            key={i}
            className="absolute top-[-2px] rounded-b-full bg-foreground"
            style={{ left: `${x}%`, width: w, height: len }}
          />
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
