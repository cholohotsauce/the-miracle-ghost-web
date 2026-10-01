import React from "react";
import GhostHero from "@/components/GhostHero";

export default function Home() {
  return (
    <main className="w-full h-[100dvh] relative bg-background text-foreground overflow-hidden overscroll-none">
      {/* 3D Ghost background layer */}
      <GhostHero />

      {/* Overlay content (if any, like title) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pb-[calc(var(--mobile-nav-h)+env(safe-area-inset-bottom))] md:pb-0 text-center pointer-events-none z-10">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-widest uppercase leading-none mb-6">
          The Miracle Ghost
        </h1>
        <p className="text-sm md:text-xl tracking-widest font-mono uppercase bg-[var(--color-neon-green)] text-foreground px-3 py-1">
          Interactive Art & Apparel
        </p>
      </div>
    </main>
  );
}
