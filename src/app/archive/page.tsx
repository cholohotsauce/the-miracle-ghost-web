import type { Metadata } from "next";
import WorksGallery from "@/components/WorksGallery";
import { works } from "@/content/works";

export const metadata: Metadata = {
  title: "Archive | The Miracle Ghost",
  description: "Paintings by The Miracle Ghost.",
};

export default function ArchivePage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-24 md:pt-32 px-4 md:px-6 lg:px-12 pb-mobile-nav">
      <header className="mb-10 md:mb-16 flex flex-wrap items-end justify-between gap-4 border-b-2 border-line pb-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-widest uppercase leading-none">Archive</h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">
          {String(works.length).padStart(2, "0")} works · Tap to view
        </p>
      </header>

      <WorksGallery works={works} layout="masonry" />
    </main>
  );
}
