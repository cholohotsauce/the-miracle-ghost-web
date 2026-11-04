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
 * Round 5a (Archie, 2026-10-31): the ghost in the middle and a thin green ticker along the bottom.
 * Aes, 2026-11-04: a plain, even black (the spray marks and the TV scanlines made a grey patch),
 * the ghost twice as big and peeking up from the bottom edge, and one line on the ticker.
 */
export default function DropBanner({ drop }: { drop: NextDrop | null }) {
  return (
    <section aria-labelledby="next-drop" data-reveal className="relative mb-12 overflow-hidden bg-foreground text-background md:mb-16">
      <div className="relative overflow-hidden">
        {/* The ghost peeks up from inside the banner: twice his old size, with only his top half showing (Aes, 2026-11-04).
            On phones the sign-up sits on top and he peeks up at the right, next to NEXT DROP. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-3 h-[10rem] translate-y-1/2 md:left-1/2 md:right-auto md:h-[12.5rem] md:-translate-x-1/2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the same pre-sized still the teaser uses */}
          <img src={POSTER_URL} alt="" draggable={false} className="banner-ghost h-full w-auto select-none" />
        </div>
        <div className="relative flex flex-col gap-3 px-5 py-2.5 md:flex-row md:items-center md:justify-between md:px-10 md:py-4">
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
      </div>
      <Ticker />
    </section>
  );
}

/**
 * A thin green ticker along the bottom edge. Only "THE MIRACLE GHOST ✦ NEXT DROP SOON", over and over,
 * evenly spaced (Aes, 2026-11-04). Two copies side by side, so the loop never shows a gap.
 */
function Ticker() {
  const copy = (
    <span className="flex shrink-0 items-center">
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="flex shrink-0 items-center gap-4 pr-4">
          <span>The Miracle Ghost</span>
          <span aria-hidden>✦</span>
          <span>Next drop soon</span>
          <span aria-hidden>✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <div aria-hidden className="relative overflow-hidden border-t border-background/15 bg-foreground py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-neon-green)]">
      <div className="banner-ticker flex w-max">
        {copy}
        {copy}
      </div>
    </div>
  );
}
