/**
 * Reads Aes's products from the Shopify Storefront API for the shop grid and product pages.
 * Cart and checkout stay with the Shopify Buy Button (see components/ShopifyBuyButton.tsx).
 *
 * The storefront token is public by design: it can only read the catalog and build carts.
 * If Shopify can't be reached (for example in a build without network), the pages fall back to
 * the snapshot in content/catalogSnapshot.ts so the site still renders.
 */

import { catalogSnapshot } from "@/content/catalogSnapshot";

export const SHOP_DOMAIN = "themiracleghost.myshopify.com";
export const STOREFRONT_TOKEN = "8f303ed215e5f3413f1c496f63fa84e3";
const API_VERSION = "2025-10";
/** Seconds before the site asks Shopify again for prices and stock */
export const CATALOG_REVALIDATE = 60;

export type ProductImage = { url: string; alt: string; width: number | null; height: number | null };

export type Product = {
  /** Numeric Shopify id, what the Buy Button wants */
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  available: boolean;
  price: { amount: number; currency: string };
  images: ProductImage[];
};

const QUERY = /* GraphQL */ `
  query Products {
    products(first: 50, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        handle
        title
        description
        productType
        availableForSale
        priceRange { minVariantPrice { amount currencyCode } }
        images(first: 6) { nodes { url altText width height } }
      }
    }
  }
`;

type RawProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  availableForSale: boolean;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  images: { nodes: { url: string; altText: string | null; width: number | null; height: number | null }[] };
};

function toProduct(p: RawProduct): Product {
  return {
    id: p.id.split("/").pop() ?? p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    productType: p.productType,
    available: p.availableForSale,
    price: { amount: Number(p.priceRange.minVariantPrice.amount), currency: p.priceRange.minVariantPrice.currencyCode },
    images: p.images.nodes.map((img) => ({
      url: img.url,
      alt: img.altText || `${p.title}, by The Miracle Ghost`,
      width: img.width,
      height: img.height,
    })),
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`https://${SHOP_DOMAIN}/api/${API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
      next: { revalidate: CATALOG_REVALIDATE, tags: ["catalog"] },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`Shopify ${res.status}`);
    const json = await res.json();
    const nodes: RawProduct[] | undefined = json?.data?.products?.nodes;
    if (!nodes) throw new Error("Shopify returned no products");
    return nodes.map(toProduct);
  } catch (err) {
    console.warn("[shopify] using the catalog snapshot:", err instanceof Error ? err.message : err);
    return catalogSnapshot;
  }
}

export async function getProduct(handle: string) {
  return (await getProducts()).find((p) => p.handle === handle) ?? null;
}

export function formatPrice({ amount, currency }: Product["price"]) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
