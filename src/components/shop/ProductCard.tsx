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
  // A second photo shows on hover, like a fashion shop (Round 4)
  const back = !lockedUntil ? product.images[1] : undefined;
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
      <div className="holo-shadow holo-teal relative aspect-[4/5] overflow-hidden border-2 border-line bg-muted transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[8px_8px_0_var(--color-neon-teal)]">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            // Comes in from a soft blur once loaded (globals.css); a locked piece stays blurred on purpose
            onLoad={(e) => {
              e.currentTarget.dataset.loaded = "";
            }}
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.04] ${lockedUntil ? "scale-110 blur-xl" : "photo-in"}`}
          />
        )}
        {back && (
          <Image
            src={back.url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
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
      {/* Two cards side by side on phones leave no room for the price next to the title, so it goes under */}
      <div className="mt-3 flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black uppercase tracking-widest [overflow-wrap:anywhere]">{product.title}</h2>
          {edition && <p data-scramble className="mt-0.5 font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">{edition}</p>}
        </div>
        <p className={`shrink-0 font-mono text-sm ${product.available ? "" : "line-through opacity-50"}`}>{price}</p>
      </div>
    </TransitionLink>
  );
}
