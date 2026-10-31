import { POSTER_URL } from "@/components/ghost/GhostPoster";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import type { NextDrop } from "@/content/drops";
import Countdown from "./Countdown";

/**
 * The black banner at the top of the Shop (Aes's mockup, 2026-10-15):
 * drop-alert sign-up on the left, NEXT DROP countdown on the right.
 * With no drop scheduled (content/drops.ts), the countdown makes way for a glitching "Soon." like the teaser's.
 * Aes asked for it 30% shorter at the same width (2026-10-19), then another 20% shorter the same day:
 * tighter padding and gaps, smaller type.
 * Round 5a (Archie, 2026-10-31): more than a black box. It reads like an old TV left on in the dark:
 * faint scanlines with a slow rolling band, the ghost floating and fading in the middle like on the teaser,
 * and a thin green ticker running along the bottom.
 */
export default function DropBanner({ drop }: { drop: NextDrop | null }) {
  return (
    <section
      aria-labelledby="next-drop"
      data-reveal
      className="relative mb-12 overflow-hidden bg-foreground text-background md:mb-16"
    >
      <SprayBackdrop />
      <div aria-hidden className="tv-scanlines pointer-events-none absolute inset-0" />
      {/* The ghost haunts the empty middle of the banner (on phones he drifts at the right edge, dimmer) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-3 top-1.5 h-[5.5rem] md:left-1/2 md:right-auto md:top-1/2 md:h-[6.25rem] md:-translate-x-1/2 md:-translate-y-[55%]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the same pre-sized still the teaser uses */}
        <img src={POSTER_URL} alt="" draggable={false} className="banner-ghost h-full w-auto select-none" />
      </div>
      <div className="relative flex flex-col-reverse gap-2 px-5 py-2.5 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
        <div className="w-full max-w-md">
          <EarlyAccessForm from="shop-drop-alerts" banner prompt="Sign up for drop alerts" cta="Sign up" />
        </div>
        <div className="flex flex-col items-start md:items-center">
          <h2 id="next-drop" className="whitespace-nowrap font-drip text-[7.5vw] uppercase leading-none md:text-5xl">
            {drop?.title ?? "Next drop"}
          </h2>
          {drop ? (
            <Countdown
              to={drop.releasesAt}
              className="mt-1 gap-4 text-[var(--color-neon-green)] md:mt-1.5 md:gap-5"
              numberClassName="text-[5.5vw] font-black md:text-4xl"
              labelClassName="font-mono text-xs tracking-[0.2em] md:text-xs"
            />
          ) : (
            // The teaser's SOON: it glitches into pink and teal slices now and then, and the green dot breathes
            <p aria-label="Soon" className="mt-1 text-3xl font-black uppercase text-[var(--color-neon-green)] md:mt-1.5 md:text-4xl">
              <span aria-hidden>
                <span className="soon-glitch" data-text="Soon">
                  Soon
                </span>
                <span className="teaser-dot">.</span>
              </span>
            </p>
          )}
        </div>
      </div>
      <Ticker words={drop ? [drop.title, "Set your alarm"] : ["Next drop soon", "Sign up and the ghost tells you first"]} />
    </section>
  );
}

/** A thin green ticker along the bottom edge: two copies side by side, so the loop never shows a gap */
function Ticker({ words }: { words: string[] }) {
  const line = [...words, "The Miracle Ghost", "Miami", ...words, "The Miracle Ghost", "Miami"];
  const copy = (
    <span className="flex shrink-0 items-center">
      {line.map((w, i) => (
        <span key={i} className="flex items-center">
          <span className="px-4">{w}</span>
          <span className="text-background/40">✱</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="relative overflow-hidden border-t border-background/15 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-neon-green)]">
      <div className="banner-ticker flex w-max">
        {copy}
        {copy}
      </div>
    </div>
  );
}

/** Faint spray strokes behind the banner, like the wall it was painted on */
function SprayBackdrop() {
  return (
    <svg aria-hidden viewBox="0 0 1000 250" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <filter id="spray-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g filter="url(#spray-soft)" className="fill-background" opacity="0.07">
        <path d="M30 70 C180 30 420 40 560 80 C600 120 560 190 470 200 C330 215 150 210 50 180 C10 150 0 100 30 70Z" />
        <path d="M600 60 C720 20 900 30 970 70 C995 130 980 200 900 215 C790 230 650 220 610 180 C580 140 575 90 600 60Z" />
      </g>
    </svg>
  );
}
