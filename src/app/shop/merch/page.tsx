import type { Metadata } from "next";
import CategoryPage from "@/components/shop/CategoryPage";
import { SHOP_CATEGORIES } from "@/content/shopCategories";

// Ask Shopify for fresh prices and stock at most once a minute (same as CATALOG_REVALIDATE)
export const revalidate = 60;

const category = SHOP_CATEGORIES.find((c) => c.slug === "merch")!;

export const metadata: Metadata = {
  title: `${category.label} | Shop`,
  description: category.description,
  alternates: { canonical: "/shop/merch" },
};

export default function MerchPage() {
  return <CategoryPage slug="merch" />;
}
