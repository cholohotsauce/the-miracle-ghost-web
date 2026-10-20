"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion, type Transition } from "framer-motion";

/**
 * Page changes as a clean black panel edged in toxic green: it slides down over the page while the
 * next page's name drops in letter by letter, falling the same way as the panel. The next page loads
 * behind it, and the panel keeps sliding down to reveal it.
 * Aes asked for no drips on it, and for the letters to fall with the panel, not rise (2026-10-20).
 * Links opt in through TransitionLink. Browser back and forward stay instant.
 */

type Phase = "idle" | "cover" | "wait" | "reveal";

const Ctx = createContext<{ navigate: (href: string, label?: string) => void } | null>(null);

export const useTransitionNav = () => useContext(Ctx);

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
  // Off screen above, covering, then off screen below
  const y = phase === "idle" ? "-100%" : phase === "reveal" ? "100%" : "0%";
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
      {/* A thin band of toxic green on both edges: it leads the panel down and trails it off */}
      <div className="absolute inset-x-0 bottom-full h-2 bg-[var(--color-neon-green)]" />
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-foreground">
        {/* The page name drops in letter by letter while the panel covers, and blurs away as it slides off */}
        <motion.span
          className="flex font-drip text-[clamp(3rem,14vw,9rem)] uppercase leading-none text-background"
          initial={false}
          animate={covering ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: covering ? 0 : 0.25 }}
        >
          {[...label].map((ch, i) => (
            <motion.span
              // A fresh key on each trip, so the letters drop again even when the name is the same
              key={`${phase === "idle" ? "off" : "on"}-${i}`}
              className="inline-block whitespace-pre"
              initial={{ y: "-120%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              // A quick fall with a small settle as each letter lands
              transition={{
                y: { type: "spring", stiffness: 520, damping: 22, mass: 0.9, delay: 0.15 + i * 0.05 },
                opacity: { duration: 0.15, delay: 0.15 + i * 0.05 },
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>
      </div>
      <div className="absolute inset-x-0 top-full h-2 bg-[var(--color-neon-green)]" />
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
