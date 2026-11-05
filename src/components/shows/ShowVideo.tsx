"use client";

import type { ReactNode } from "react";
import { playVideo, videoStill } from "@/lib/ghostCam";

/**
 * A show title that plays the show's video in Ghost Cam (components/site/GhostCam.tsx).
 * `src` is a YouTube link or a video file under /public.
 * On hover, the video's still shows through the letters of the title, as a little preview.
 */
export default function ShowVideo({
  src,
  title,
  label = "Recap",
  poster,
  children,
}: {
  src: string;
  title: string;
  label?: string;
  poster?: string;
  children: ReactNode;
}) {
  const still = videoStill(src, poster);

  return (
    <button
      type="button"
      onClick={() => playVideo({ src, title, label, poster })}
      aria-haspopup="dialog"
      className="group/video relative inline text-left uppercase outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
    >
      <span className="relative inline-block">
        {children}
        {/* The preview through the letters: the still, clipped to the title's own text */}
        {still && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-clip-text text-transparent opacity-0 transition-opacity duration-300 group-hover/video:opacity-100 group-focus-visible/video:opacity-100"
            style={{ backgroundImage: `url(${still})` }}
          >
            {title}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className="ml-3 inline-flex size-8 -translate-y-1 items-center justify-center rounded-full bg-foreground align-middle text-background transition-[background-color,color,scale] group-hover/video:scale-110 group-hover/video:bg-[var(--color-neon-green)] group-hover/video:text-foreground md:size-9"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 size-3.5 md:size-4" fill="currentColor">
          <path d="M7 4.5v15l13-7.5z" />
        </svg>
      </span>
      <span className="sr-only">, play the {label.toLowerCase()} video</span>
    </button>
  );
}
