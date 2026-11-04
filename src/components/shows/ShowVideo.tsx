"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A show title that plays the show's recap video right on the site (Aes, 2026-11-04: "Partners in Crime").
 * `src` is a video file under /public (e.g. "/videos/partners-in-crime.mp4") or a YouTube or Vimeo link.
 * The video opens in a dark window over the page; Escape, the × button, or a click outside closes it.
 */
export default function ShowVideo({ src, title, children }: { src: string; title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const embed = embedUrl(src);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group/video inline text-left uppercase underline decoration-[var(--color-neon-green)] decoration-[3px] underline-offset-[6px] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
      >
        {children}
        <span
          aria-hidden
          className="ml-3 inline-flex size-8 -translate-y-1 items-center justify-center rounded-full bg-foreground align-middle text-background transition-colors group-hover/video:bg-[var(--color-neon-green)] group-hover/video:text-foreground md:size-9"
        >
          <svg viewBox="0 0 24 24" className="ml-0.5 size-3.5 md:size-4" fill="currentColor">
            <path d="M7 4.5v15l13-7.5z" />
          </svg>
        </span>
        <span className="sr-only">, watch the recap video</span>
      </button>

      <dialog
        ref={dialog}
        aria-label={`${title}: recap video`}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A click on the dark backdrop (the dialog itself, not the video) closes it
          if (e.target === e.currentTarget) setOpen(false);
        }}
        className="m-auto w-[min(92vw,64rem)] max-w-none overflow-visible bg-transparent p-0 backdrop:bg-black/85"
      >
        {open && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the video"
              className="absolute -top-12 right-0 grid size-10 place-items-center rounded-full border-2 border-white font-mono text-lg text-white transition-colors hover:bg-white hover:text-black"
            >
              ×
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-[18px] bg-black shadow-[8px_8px_0_var(--color-neon-green)]">
              {embed ? (
                <iframe
                  src={embed}
                  title={`${title}: recap video`}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <video src={src} controls autoPlay playsInline className="h-full w-full bg-black" />
              )}
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.2em] text-white/70">{title} · Recap</p>
          </div>
        )}
      </dialog>
    </>
  );
}

/** The player address for a YouTube or Vimeo link, or null for a plain video file */
function embedUrl(src: string): string | null {
  try {
    const u = new URL(src, "https://local.invalid");
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0`;
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null;
    }
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}?autoplay=1`;
    return null;
  } catch {
    return null;
  }
}
