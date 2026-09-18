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
    <main className="w-full min-h-screen bg-background text-foreground pt-32 px-6 lg:px-12 pb-24">
      <h1 className="text-4xl font-bold tracking-widest uppercase mb-12">Archive / Gallery</h1>
      
      <div className="columns-1 sm:columns-2 md:columns-3 gap-6 space-y-6">
        {archiveItems.map((item) => (
          <div 
            key={item.id}
            className={`w-full bg-[#1a1a1a] ${item.height} rounded-none border border-zinc-800 hover:border-[var(--color-neon-pink)] transition-colors duration-300 flex items-center justify-center break-inside-avoid`}
          >
            <span className="text-zinc-600 font-mono tracking-widest uppercase text-sm">
              Artwork_{item.id}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
