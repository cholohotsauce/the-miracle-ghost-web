import React from "react";
import GhostHero from "@/components/GhostHero";

export default function Home() {
  return (
    <main className="w-full h-screen relative bg-background text-foreground overflow-hidden">
      {/* 3D Ghost background layer */}
      <GhostHero />
      
      {/* Overlay content (if any, like title) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <h1 className="text-6xl font-bold tracking-widest uppercase mb-4 opacity-80">
          The Miracle Ghost
        </h1>
        <p className="text-xl tracking-widest font-mono text-[var(--color-neon-pink)] opacity-90">
          Interactive Art & Apparel
        </p>
      </div>
    </main>
  );
}
