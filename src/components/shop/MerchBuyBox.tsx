"use client";

import { useEffect, useRef, useState } from "react";
import { emitGhost } from "@/lib/ghostBus";
import type { Product, ProductVariant } from "@/lib/shopify";
import { addToCart, getCart } from "@/lib/shopifyCart";
import { track } from "@/lib/stats";

type Props = {
  options: NonNullable<Product["options"]>;
  variants: ProductVariant[];
  /** The product's lowest price, already formatted, shown until a choice changes it */
  price: string;
  /** Formatted price of each variant, by variant id */
  variantPrices: Record<string, string>;
};

const findVariant = (variants: ProductVariant[], picked: Record<string, string>, options: Props["options"]) =>
  variants.find((v) => options.every((o) => v.options.some((s) => s.name === o.name && s.value === picked[o.name])));

/**
 * Merch buy box from Aes's mockup (2026-11-05): price box, a row of buttons per option (Size),
 * the picked one turns green, and a big green Add to Cart. The Shopify Buy Button SDK cart takes it from there.
 */
export default function MerchBuyBox({ options, variants, price, variantPrices }: Props) {
  // A product without choices has one variant that is always "picked"
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "adding" | "error">("idle");
  const [nudge, setNudge] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const variant = options.length === 0 ? variants[0] : findVariant(variants, picked, options);
  const missing = options.find((o) => !picked[o.name]);

  // Show the cart tab (and anything already in the cart) as soon as the page opens
  useEffect(() => {
    getCart().catch(() => {});
  }, []);

  /** A value is sold out when no variant with it (and the other picks) is still for sale */
  const soldOut = (name: string, value: string) =>
    !variants.some(
      (v) =>
        v.available &&
        v.options.some((s) => s.name === name && s.value === value) &&
        options.every((o) => o.name === name || !picked[o.name] || v.options.some((s) => s.name === o.name && s.value === picked[o.name])),
    );

  async function add() {
    if (missing || !variant) {
      setNudge((n) => n + 1);
      return;
    }
    setStatus("adding");
    try {
      await addToCart(variant.id);
      setStatus("idle");
      emitGhost({ type: "cart-add" });
      track("add_to_cart");
      // A little bounce with a green ring (globals.css, Round 5b)
      const box = boxRef.current;
      if (box) {
        box.classList.remove("cart-bounce");
        void box.offsetWidth;
        box.classList.add("cart-bounce");
      }
    } catch {
      setStatus("error");
    }
  }

  const shownPrice = variant ? variantPrices[variant.id] ?? price : price;
  const unavailable = variant ? !variant.available : false;

  return (
    <div className="flex flex-col gap-6">
      <div className="border-2 border-foreground px-5 py-4">
        <p className="text-xs uppercase tracking-[0.2em] text-foreground/60">Price</p>
        <p className="mt-1 text-3xl md:text-4xl">{shownPrice}</p>
      </div>

      {options.map((o) => (
        <fieldset key={o.name} className="flex flex-col gap-3">
          <legend className="mb-3 text-xs uppercase tracking-[0.2em] text-foreground/60">{o.name}</legend>
          <div key={missing?.name === o.name ? nudge : 0} className={`grid grid-cols-5 gap-2 md:gap-3 ${nudge && missing?.name === o.name ? "err-glitch" : ""}`}>
            {o.values.map((value) => {
              const on = picked[o.name] === value;
              const out = soldOut(o.name, value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  disabled={out}
                  onClick={() => setPicked((p) => ({ ...p, [o.name]: value }))}
                  className={`min-h-12 border-2 border-foreground text-base uppercase transition-colors md:min-h-14 md:text-lg ${
                    on ? "bg-[var(--color-neon-green)]" : "bg-background hover:bg-foreground hover:text-background"
                  } disabled:cursor-not-allowed disabled:text-foreground/30 disabled:line-through disabled:hover:bg-background`}
                >
                  {value}
                </button>
              );
            })}
          </div>
          {nudge > 0 && missing?.name === o.name && (
            <p role="alert" className="text-sm text-[var(--color-neon-pink)]">
              Pick a {o.name.toLowerCase()} first.
            </p>
          )}
        </fieldset>
      ))}

      <div ref={boxRef}>
        <button
          type="button"
          onClick={add}
          disabled={status === "adding" || unavailable}
          className="min-h-16 w-full bg-[var(--color-neon-green)] text-xl uppercase tracking-[0.04em] text-foreground transition-[filter,transform] hover:brightness-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 md:text-2xl"
        >
          {unavailable ? "Sold out" : status === "adding" ? "Adding…" : "Add to cart"}
        </button>
        {status === "error" && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-neon-pink)]">
            The cart didn&apos;t load. Refresh the page and try again.
          </p>
        )}
      </div>
    </div>
  );
}
