"use client";

import Image from "next/image";
import TransitionLink from "@/components/site/TransitionLink";
import type { ProductImage } from "@/lib/shopify";
import { emitGhost } from "@/lib/ghostBus";
import type { ShopCategory } from "@/content/shopCategories";

/**
 * One of the two big doors on the Shop page: 01 MERCH (black) and 02 ARTWORK (white).
 * A photo of a piece from behind the door sits dimmed under the word, and comes up a little on hover.
 */
export default function CategoryCard({ category, index, photo }: { category: ShopCategory; index: number; photo?: ProductImage }) {
  const dark = index % 2 === 0;
  const look = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    emitGhost({ type: "look", x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <TransitionLink
      href={`/shop/${category.slug}`}
      curtain={category.label}
      onPointerEnter={(e) => look(e.currentTarget)}
      onFocus={(e) => look(e.currentTarget)}
      onPointerLeave={() => emitGhost({ type: "look-away" })}
      onBlur={() => emitGhost({ type: "look-away" })}
      className={`holo-shadow group relative flex aspect-[9/4] items-center justify-center overflow-hidden border-2 border-line transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_var(--color-neon-green)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground ${
        dark ? "bg-foreground text-background" : "bg-background text-foreground"
      }`}
    >
      {photo && (
        <Image
          src={photo.url}
          alt=""
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          onLoad={(e) => {
            e.currentTarget.dataset.loaded = "";
          }}
          className={`photo-in object-cover [--photo-move:0.7s] group-hover:scale-105 ${
            dark ? "photo-door-dark" : "photo-door-light"
          }`}
        />
      )}
      <span className="absolute left-4 top-3 z-[1] text-xl font-medium md:left-6 md:top-4 md:text-2xl">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        aria-hidden
        data-magnetic
        className="absolute right-3 top-3 z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-neon-green)] text-foreground transition-transform duration-300 group-hover:rotate-45 md:right-4 md:top-4 md:h-12 md:w-12"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
      <span className="relative font-drip text-[13vw] uppercase leading-none md:text-5xl lg:text-7xl">{category.label}</span>
    </TransitionLink>
  );
}
