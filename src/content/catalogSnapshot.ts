import type { Product } from "@/lib/shopify";

/**
 * A copy of the Shopify catalog taken on 2026-10-04, used only when Shopify can't be reached.
 * The live site reads Shopify directly; this keeps pages rendering if that call fails.
 */
export const catalogSnapshot: Product[] = [
  {
    id: "15303332987252",
    handle: "apoca-riders-1",
    title: "Apoca Riders -1",
    description: "",
    productType: "Original Art",
    available: true,
    price: { amount: 580, currency: "CAD" },
    images: [
      {
        url: "https://cdn.shopify.com/s/files/1/1025/5656/5876/files/Screenshot_2026-03-07_at_2.16.38_PM.png?v=1789603994",
        alt: "Apoca Riders -1, by The Miracle Ghost",
        width: null,
        height: null,
      },
    ],
  },
  {
    id: "15303320273268",
    handle: "pussy-ghost",
    title: "Pussy&Ghost",
    description: "",
    productType: "Original Art",
    available: true,
    price: { amount: 2000, currency: "CAD" },
    images: [
      {
        url: "https://cdn.shopify.com/s/files/1/1025/5656/5876/files/Screenshot_2026-03-07_at_2.16.26_PM.png?v=1789603994",
        alt: "Pussy&Ghost, by The Miracle Ghost",
        width: null,
        height: null,
      },
    ],
  },
  {
    id: "15303307592052",
    handle: "neon-ghost",
    title: "Neon Ghost",
    description: "",
    productType: "Original Art",
    available: true,
    price: { amount: 800, currency: "CAD" },
    images: [
      {
        url: "https://cdn.shopify.com/s/files/1/1025/5656/5876/files/Screenshot_2026-03-07_at_2.16.47_PM.png?v=1789603994",
        alt: "Neon Ghost, by The Miracle Ghost",
        width: null,
        height: null,
      },
    ],
  },
  {
    id: "15302927286644",
    handle: "neon-3-eyed-ghost",
    title: "Neon 3-Eyed Ghost",
    description: 'Original mixed media canvas. 24" x 24". From the Miami archives.',
    productType: "Original Art",
    available: true,
    price: { amount: 1200, currency: "CAD" },
    images: [
      {
        url: "https://cdn.shopify.com/s/files/1/1025/5656/5876/files/Screenshot2026-03-07at2.17.05PM.png?v=1789595462",
        alt: "Neon 3-Eyed Ghost, by The Miracle Ghost",
        width: null,
        height: null,
      },
    ],
  },
];
