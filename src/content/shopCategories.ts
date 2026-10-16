import type { Product } from "@/lib/shopify";

/**
 * The two doors on the Shop page (Aes's mockup, 2026-10-15), in the order the cards appear.
 * A product is Artwork when its Shopify product type says art, painting, or canvas; everything else is Merch.
 * Each slug is also a page under /shop, so no Shopify product handle may be "merch" or "artwork".
 */
export const SHOP_CATEGORIES = [
  {
    slug: "merch",
    label: "Merch",
    description: "Tees, prints, and gear from The Miracle Ghost.",
    empty: "No merch on the rack yet. The ghost is still printing.",
  },
  {
    slug: "artwork",
    label: "Artwork",
    description: "Original paintings from The Miracle Ghost. One of one, straight from the wall.",
    empty: "Every piece is sold. New work lands with the next drop.",
  },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];
export type ShopCategorySlug = ShopCategory["slug"];

const isArtwork = (p: Pick<Product, "productType">) => /art|painting|canvas/i.test(p.productType);

export function categoryOf(p: Pick<Product, "productType">): ShopCategory {
  return SHOP_CATEGORIES[isArtwork(p) ? 1 : 0];
}

export function inCategory(products: Product[], slug: ShopCategorySlug) {
  return products.filter((p) => categoryOf(p).slug === slug);
}
