import Link from "next/link";
import GhostHero from "@/components/GhostHero";
import WorksGallery from "@/components/WorksGallery";
import { works } from "@/content/works";

export default function Home() {
  return (
    <main className="w-full bg-background text-foreground">
      <GhostHero />

      <section aria-labelledby="selected-works" className="px-4 md:px-6 lg:px-12 pt-16 md:pt-24 pb-mobile-nav">
        <div className="mb-8 md:mb-12 flex items-end justify-between gap-4 border-b-2 border-line pb-4">
          <h2 id="selected-works" className="text-2xl md:text-4xl font-black uppercase tracking-widest leading-none">
            Selected Works
          </h2>
          <Link
            href="/archive"
            className="font-mono text-xs uppercase tracking-[0.2em] underline-offset-8 hover:underline decoration-[var(--color-neon-pink)] decoration-2"
          >
            Archive ({String(works.length).padStart(2, "0")}) →
          </Link>
        </div>
        <WorksGallery works={works} layout="strip" />
      </section>
    </main>
  );
}
