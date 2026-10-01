import React from "react";

export default function ArchivePage() {
  // Dummy data for masonry items
  const archiveItems = [
    { id: 1, height: "h-64" },
    { id: 2, height: "h-96" },
    { id: 3, height: "h-72" },
    { id: 4, height: "h-80" },
    { id: 5, height: "h-96" },
    { id: 6, height: "h-64" },
    { id: 7, height: "h-[22rem]" },
    { id: 8, height: "h-72" },
  ];

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-24 md:pt-32 px-5 md:px-6 lg:px-12 pb-mobile-nav">
      <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase mb-8 md:mb-12">Archive / Gallery</h1>

      <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6 touch-pan-y">
        {archiveItems.map((item) => (
          <div
            key={item.id}
            className={`w-full bg-muted ${item.height} rounded-none border-2 border-line hover:shadow-[8px_8px_0_var(--color-neon-pink)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center break-inside-avoid`}
          >
            <span className="text-foreground/50 font-mono tracking-widest uppercase text-sm">
              Artwork_{item.id}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
