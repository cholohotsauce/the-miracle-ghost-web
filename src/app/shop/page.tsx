import React from "react";
import ShopifyBuyButton from "@/components/ShopifyBuyButton";

export default function ShopPage() {
  return (
    <main className="w-full min-h-screen bg-background text-foreground pt-32 px-6 lg:px-12 pb-24">
      <h1 className="text-4xl font-bold tracking-widest uppercase mb-12">Shop / Drops</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="p-8 border border-zinc-800 bg-[#151515] hover:border-[var(--color-neon-teal)] transition-colors duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303332987252" />
        </div>
        <div className="p-8 border border-zinc-800 bg-[#151515] hover:border-[var(--color-neon-teal)] transition-colors duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303320273268" />
        </div>
        <div className="p-8 border border-zinc-800 bg-[#151515] hover:border-[var(--color-neon-teal)] transition-colors duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303307592052" />
        </div>
        <div className="p-8 border border-zinc-800 bg-[#151515] hover:border-[var(--color-neon-teal)] transition-colors duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15302927286644" />
        </div>
      </div>
    </main>
  );
}
