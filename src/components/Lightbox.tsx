"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { Work } from "@/content/works";

type Props = {
  works: Work[];
  index: number | null;
  onClose: () => void;
  onIndex: (index: number) => void;
};

const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 400;

export default function Lightbox({ works, index, onClose, onIndex }: Props) {
  const open = index !== null;
  const [direction, setDirection] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      setDirection(delta);
      onIndex((index + delta + works.length) % works.length);
    },
    [index, onIndex, works.length],
  );
  const goRef = useRef(go);
  const closeHandler = useRef(onClose);
  useEffect(() => {
    goRef.current = go;
    closeHandler.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHandler.current();
      if (e.key === "ArrowRight") goRef.current(1);
      if (e.key === "ArrowLeft") goRef.current(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus?.focus();
    };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) go(1);
    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) go(-1);
  };

  const work = index !== null ? works[index] : null;

  return (
    <AnimatePresence>
      {work && index !== null && (
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${work.title}, work ${index + 1} of ${works.length}`}
          className="fixed inset-0 z-[60] flex flex-col bg-[#060609]/95 text-white backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Colored light behind the work, taken from its glow */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            animate={{
              background: `radial-gradient(60% 55% at 50% 45%, ${work.accent}2e 0%, transparent 70%)`,
            }}
            transition={{ duration: 0.6 }}
          />

          <div className="relative z-10 flex items-center justify-between px-4 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-2 font-mono text-xs uppercase tracking-[0.2em]">
            <span className="tabular-nums text-white/70">
              {String(index + 1).padStart(2, "0")} / {String(works.length).padStart(2, "0")}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="-mr-2 flex h-11 items-center gap-2 px-2 uppercase text-white/80 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              Close
              <span aria-hidden className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={work.slug}
                custom={direction}
                className="absolute inset-0 px-4 md:px-16 py-2 md:py-6 touch-pan-y cursor-grab active:cursor-grabbing"
                variants={{
                  enter: (d: number) => ({ x: d === 0 ? 0 : d > 0 ? "40%" : "-40%", opacity: 0, scale: d === 0 ? 0.96 : 1 }),
                  center: { x: 0, opacity: 1, scale: 1 },
                  exit: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 260, damping: 32, opacity: { duration: 0.25 } }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                onDragEnd={onDragEnd}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={work.image}
                    alt={work.alt}
                    fill
                    sizes="100vw"
                    placeholder="blur"
                    draggable={false}
                    className="select-none object-contain"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 px-2 md:px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous work"
              className="flex h-12 w-12 items-center justify-center text-2xl text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              ←
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate text-base md:text-lg font-black uppercase tracking-widest">{work.title}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">The Miracle Ghost</p>
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next work"
              className="flex h-12 w-12 items-center justify-center text-2xl text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              →
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
