import type { Metadata } from "next";
import { POSTER_URL } from "@/components/ghost/GhostPoster";
import Countdown from "@/components/site/Countdown";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import { LAUNCH_AT, launchDateLabel } from "@/lib/launch";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  description: "Something is moving in. The Miracle Ghost, the street artist Aes out of Miami, opens soon.",
};

/**
 * The "Spooky soon" teaser. src/proxy.ts shows it on the public domain until the launch.
 * It covers the whole window, so the menu and the corner ghost from the root layout stay hidden behind it.
 * The countdown and date show only once a launch date is set, and not while SITE_MODE holds the teaser.
 */
export default function Soon() {
  const launchAt = process.env.SITE_MODE === "teaser" ? null : LAUNCH_AT;

  return (
    <main className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-background px-4 pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(1.75rem,env(safe-area-inset-bottom))] text-foreground">
      <p className="text-xs uppercase tracking-[0.35em]">{SITE_NAME}</p>

      <div className="my-auto flex w-full flex-col items-center py-10">
        <div className="relative mb-10 aspect-[809/900] w-[min(46vw,260px)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- the same pre-sized still the home page shows first */}
          <img
            src={POSTER_URL}
            alt=""
            aria-hidden
            draggable={false}
            fetchPriority="high"
            className="teaser-ghost h-full w-full select-none object-contain"
          />
          <div aria-hidden className="teaser-shadow absolute inset-x-[15%] -bottom-7 h-3.5 rounded-[50%]" />
        </div>

        <h1 className="text-center text-[clamp(2.75rem,9vw,6.5rem)] uppercase leading-[0.9] tracking-[-0.04em]">
          Spooky soon<span className="text-[var(--color-neon-green)] [text-shadow:0_0_18px_rgb(57_255_20/0.7)]">.</span>
        </h1>

        {launchAt !== null && (
          <>
            <Countdown to={launchAt} />
            <p className="mt-5 text-[13px] tracking-[0.4em]">{launchDateLabel(launchAt)}</p>
          </>
        )}

        <div className="mt-9 w-full max-w-sm">
          <EarlyAccessForm from="teaser" prompt="The ghost tells you first" cta="Haunt me" />
        </div>
      </div>

      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[13px] tracking-[0.15em] underline-offset-4 hover:underline hover:decoration-[var(--color-neon-teal)] hover:decoration-2"
      >
        @{INSTAGRAM_HANDLE}
      </a>
    </main>
  );
}
