import React from "react";
import ShopifyBuyButton from "@/components/ShopifyBuyButton";

export default function ShopPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-24 md:pt-32 px-5 md:px-6 lg:px-12 pb-mobile-nav">
      <h1 className="text-3xl md:text-4xl font-black tracking-widest uppercase mb-8 md:mb-12">Shop / Drops</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10 touch-pan-y">
        <div className="p-6 md:p-8 border-2 border-line bg-background hover:shadow-[8px_8px_0_var(--color-neon-teal)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303332987252" />
        </div>
        <div className="p-6 md:p-8 border-2 border-line bg-background hover:shadow-[8px_8px_0_var(--color-neon-teal)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303320273268" />
        </div>
        <div className="p-6 md:p-8 border-2 border-line bg-background hover:shadow-[8px_8px_0_var(--color-neon-teal)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15303307592052" />
        </div>
        <div className="p-6 md:p-8 border-2 border-line bg-background hover:shadow-[8px_8px_0_var(--color-neon-teal)] hover:-translate-x-1 hover:-translate-y-1 transition-all duration-300 min-h-[400px] flex items-center justify-center">
          <ShopifyBuyButton productId="15302927286644" />
        </div>
      </div>
    </main>
  );
}
