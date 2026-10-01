"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import Lightbox from "./Lightbox";
import type { Work } from "@/content/works";

type Props = {
  works: Work[];
  /** "masonry" for the archive, "strip" for the home page preview */
  layout: "masonry" | "strip";
};

export default function WorksGallery({ works, layout }: Props) {
  const [open, setOpen] = useState<number | null>(null);

  const list =
    layout === "masonry"
      ? "columns-1 sm:columns-2 lg:columns-3 gap-6 md:gap-8"
      : "-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0";

  return (
    <>
      <ul className={list}>
        {works.map((work, i) => (
          <li
            key={work.slug}
            className={
              layout === "masonry"
                ? "mb-8 md:mb-10 break-inside-avoid"
                : "w-[72%] shrink-0 snap-center sm:w-[45%] md:w-auto"
            }
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open ${work.title}`}
              style={{ "--glow": work.accent } as CSSProperties}
              className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
            >
              <div
                className={`relative overflow-hidden bg-muted transition-[box-shadow,translate] duration-500 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_50px_-12px_var(--glow)] ${
                  layout === "strip" ? "aspect-[4/5]" : ""
                }`}
              >
                <Image
                  src={work.image}
                  alt={work.alt}
                  placeholder="blur"
                  sizes={layout === "masonry" ? "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" : "(min-width: 768px) 20vw, 72vw"}
                  className={`w-full transition-transform duration-700 ease-out group-hover:scale-[1.03] ${
                    layout === "strip" ? "h-full object-cover" : "h-auto"
                  }`}
                  {...(layout === "strip" ? { fill: true } : {})}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.2em]">
                <span className="flex items-center gap-2 font-sans text-sm font-black tracking-widest">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full ring-1 ring-foreground/40 transition-shadow duration-500 group-hover:shadow-[0_0_10px_2px_var(--glow)]"
                    style={{ background: work.accent }}
                  />
                  {work.title}
                </span>
                <span className="tabular-nums text-foreground/50">{String(i + 1).padStart(2, "0")}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox works={works} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}
