import type { Metadata } from "next";
import CategoryCard from "@/components/shop/CategoryCard";
import DropBanner from "@/components/shop/DropBanner";
import PageTitle from "@/components/site/PageTitle";
import { activeNextDrop } from "@/content/drops";
import { SHOP_CATEGORIES, inCategory } from "@/content/shopCategories";
import { getProducts } from "@/lib/shopify";

// Re-check once a minute so the banner switches to "Soon" when a countdown runs out
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description: "Merch and original artwork from The Miracle Ghost. Sign up for drop alerts and catch the next drop.",
  alternates: { canonical: "/shop" },
};

/**
 * Aes's Shop (mockup 2026-10-15): drop banner, then one door for Merch and one for Artwork, as wide as the banner.
 * Each door shows a photo of a piece behind it (Round 4 polish, 2026-10-31).
 * Aes took the "Latest off the wall" row off on 2026-11-04.
 */
export default async function ShopPage() {
  const products = await getProducts(); // newest first

  return (
    <main className="mx-auto w-full max-w-[90rem] min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <PageTitle bleed>Shop</PageTitle>
      <DropBanner drop={activeNextDrop()} />
      <ul className="grid gap-6 md:grid-cols-2 md:gap-10">
        {SHOP_CATEGORIES.map((c, i) => (
          <li key={c.slug} data-reveal="item">
            <CategoryCard category={c} index={i} photo={inCategory(products, c.slug).find((p) => p.images[0])?.images[0]} />
          </li>
        ))}
      </ul>

    </main>
  );
}
