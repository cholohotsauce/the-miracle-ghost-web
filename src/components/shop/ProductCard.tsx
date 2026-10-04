"use client";

import Image from "next/image";
import TransitionLink from "@/components/site/TransitionLink";
import { emitGhost } from "@/lib/ghostBus";
import type { Product } from "@/lib/shopify";
import Countdown from "./Countdown";
import SoldOutStamp from "./SoldOutStamp";

type Props = {
  product: Product;
  price: string;
  edition?: string;
  /** ISO time the product unlocks, when it is still in the future */
  lockedUntil?: string;
  priority?: boolean;
};

/** One piece in the Shop grid. The mini ghost turns to look at whichever card you're on. */
export default function ProductCard({ product, price, edition, lockedUntil, priority }: Props) {
  const image = product.images[0];
  const look = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    emitGhost({ type: "look", x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };

  return (
    <TransitionLink
      href={`/shop/${product.handle}`}
      curtain={product.title}
      onPointerEnter={(e) => look(e.currentTarget)}
      onFocus={(e) => look(e.currentTarget)}
      onPointerLeave={() => emitGhost({ type: "look-away" })}
      onBlur={() => emitGhost({ type: "look-away" })}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
    >
      <div className="relative aspect-[4/5] overflow-hidden border-2 border-line bg-muted transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[8px_8px_0_var(--color-neon-teal)]">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${lockedUntil ? "scale-110 blur-xl" : ""}`}
          />
        )}
        {!product.available && !lockedUntil && <SoldOutStamp />}
        {lockedUntil && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-foreground/70 text-background">
            <span className="font-drip text-3xl uppercase">Locked</span>
            <Countdown to={lockedUntil} />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black uppercase tracking-widest">{product.title}</h2>
          {edition && <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/60">{edition}</p>}
        </div>
        <p className={`font-mono text-sm ${product.available ? "" : "line-through opacity-50"}`}>{price}</p>
      </div>
    </TransitionLink>
  );
}
