import { POSTER_URL } from "@/components/ghost/GhostPoster";
import TransitionLink from "@/components/site/TransitionLink";

/**
 * "Page not found": a typo in the address, an old shared link to a product that is gone, or a page that moved.
 * The ghost floats and fades like on the teaser, and the buttons send people back into the site.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background px-5 pb-page pt-32 text-center text-foreground md:pt-36">
      <div className="relative mb-12 aspect-[809/900] w-[min(40vw,200px)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- the same pre-sized still the teaser uses */}
        <img src={POSTER_URL} alt="" aria-hidden draggable={false} className="teaser-ghost h-full w-full select-none object-contain" />
        <div aria-hidden className="teaser-shadow absolute inset-x-[15%] -bottom-7 h-3.5 rounded-[50%]" />
      </div>

      <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">Error 404</p>
      <h1 aria-label="This page got ghosted." className="mt-3 text-[clamp(2.5rem,9vw,6rem)] uppercase leading-[0.9] tracking-[-0.03em]">
        <span aria-hidden>
          This page got
          <br />
          <span className="soon-glitch" data-text="ghosted">
            ghosted
          </span>
          <span className="teaser-dot">.</span>
        </span>
      </h1>
      <p className="mt-6 max-w-sm text-base md:text-lg">It was here a second ago. Maybe it got buffed.</p>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <TransitionLink
          href="/"
          curtain="Home"
          data-magnetic
          className="inline-block rounded-full bg-foreground px-7 py-3.5 font-mono text-xs uppercase tracking-[0.2em] text-background transition-shadow hover:shadow-[4px_4px_0_var(--color-neon-green)]"
        >
          Back home
        </TransitionLink>
        <TransitionLink
          href="/shop"
          curtain="Shop"
          data-magnetic
          className="inline-block rounded-full border-2 border-foreground px-7 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-shadow hover:shadow-[4px_4px_0_var(--color-neon-green)]"
        >
          Shop
        </TransitionLink>
      </div>
    </main>
  );
}
