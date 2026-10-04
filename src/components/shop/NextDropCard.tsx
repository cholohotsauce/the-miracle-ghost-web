import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import type { NextDrop } from "@/content/drops";
import Countdown from "./Countdown";

/** The teaser for the next drop: the ghost guards it until the countdown runs out */
export default function NextDropCard({ drop }: { drop: NextDrop }) {
  return (
    <section
      aria-labelledby="next-drop"
      className="relative mb-12 overflow-hidden border-2 border-line bg-foreground px-5 py-8 text-background md:mb-16 md:px-10 md:py-10"
    >
      {drop.sample && (
        <span className="absolute right-3 top-3 border border-background/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.25em] text-background/70">
          Sample
        </span>
      )}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h2 id="next-drop" className="font-drip text-5xl uppercase leading-none md:text-7xl">
            {drop.title}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-background/80 md:text-base">{drop.teaser}</p>
        </div>
        <Countdown to={drop.releasesAt} className="text-[var(--color-neon-green)]" />
      </div>
      <div className="mt-8 max-w-md [&_input]:border-background [&_input]:bg-foreground [&_input]:text-background [&_button]:bg-[var(--color-neon-green)] [&_button]:text-foreground">
        <EarlyAccessForm from="shop-next-drop" prompt="Get on the list. The ghost tells you first." />
      </div>
    </section>
  );
}
