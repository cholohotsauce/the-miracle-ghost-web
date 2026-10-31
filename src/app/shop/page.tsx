import type { Metadata } from "next";
import CategoryCard from "@/components/shop/CategoryCard";
import DropBanner from "@/components/shop/DropBanner";
import PageTitle from "@/components/site/PageTitle";
import { activeNextDrop } from "@/content/drops";
import { SHOP_CATEGORIES } from "@/content/shopCategories";

// Re-check once a minute so the banner switches to "Soon" when a countdown runs out
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description: "Merch and original artwork from The Miracle Ghost. Sign up for drop alerts and catch the next drop.",
  alternates: { canonical: "/shop" },
};

/** Aes's Shop (mockup 2026-10-15): drop banner, then one door for Merch and one for Artwork, as wide as the banner */
export default function ShopPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <PageTitle bleed>Shop</PageTitle>
      <DropBanner drop={activeNextDrop()} />
      <ul className="grid gap-6 md:grid-cols-2 md:gap-10">
        {SHOP_CATEGORIES.map((c, i) => (
          <li key={c.slug} data-reveal="item">
            <CategoryCard category={c} index={i} />
          </li>
        ))}
      </ul>
    </main>
  );
}
