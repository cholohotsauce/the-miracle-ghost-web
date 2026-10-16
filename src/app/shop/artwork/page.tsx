import type { Metadata } from "next";
import CategoryPage from "@/components/shop/CategoryPage";
import { SHOP_CATEGORIES } from "@/content/shopCategories";

// Ask Shopify for fresh prices and stock at most once a minute (same as CATALOG_REVALIDATE)
export const revalidate = 60;

const category = SHOP_CATEGORIES.find((c) => c.slug === "artwork")!;

export const metadata: Metadata = {
  title: `${category.label} | Shop`,
  description: category.description,
  alternates: { canonical: "/shop/artwork" },
};

export default function ArtworkPage() {
  return <CategoryPage slug="artwork" />;
}
