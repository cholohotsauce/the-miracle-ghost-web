import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import type { NextDrop } from "@/content/drops";
import Countdown from "./Countdown";

/**
 * The black banner at the top of the Shop (Aes's mockup, 2026-10-15):
 * drop-alert sign-up on the left, NEXT DROP countdown on the right.
 * With no drop scheduled, the countdown makes way for "Soon".
 * Aes asked for it 30% shorter at the same width (2026-10-19), then another 20% shorter the same day:
 * tighter padding and gaps, smaller type.
 */
export default function DropBanner({ drop }: { drop: NextDrop | null }) {
  return (
    <section
      aria-labelledby="next-drop"
      data-reveal
      className="relative mb-12 overflow-hidden bg-foreground px-5 py-2.5 text-background md:mb-16 md:px-10 md:py-4"
    >
      <SprayBackdrop />
      {drop?.sample && (
        <span className="absolute right-3 top-3 border border-background/40 md:left-1/2 md:right-auto md:-translate-x-1/2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-background/70">
          Sample
        </span>
      )}
      <div className="relative flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-between">
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
              labelClassName="font-mono text-[10px] tracking-[0.2em] md:text-xs"
            />
          ) : (
            <p className="mt-1 text-3xl font-black uppercase text-[var(--color-neon-green)] md:mt-1.5 md:text-4xl">Soon</p>
          )}
        </div>
      </div>
    </section>
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
