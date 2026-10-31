import type { Metadata } from "next";
import CategoryCard from "@/components/shop/CategoryCard";
import DropBanner from "@/components/shop/DropBanner";
import ProductCard from "@/components/shop/ProductCard";
import PageTitle from "@/components/site/PageTitle";
import { activeNextDrop, editionFor, lockedUntil } from "@/content/drops";
import { SHOP_CATEGORIES, inCategory } from "@/content/shopCategories";
import { formatPrice, getProducts } from "@/lib/shopify";

// Re-check once a minute so the banner switches to "Soon" when a countdown runs out
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description: "Merch and original artwork from The Miracle Ghost. Sign up for drop alerts and catch the next drop.",
  alternates: { canonical: "/shop" },
};

/**
 * Aes's Shop (mockup 2026-10-15): drop banner, then one door for Merch and one for Artwork, as wide as the banner.
 * Each door shows a photo of a piece behind it, and the newest pieces sit underneath (Round 4 polish, 2026-10-31).
 */
export default async function ShopPage() {
  const products = await getProducts(); // newest first
  const latest = products.slice(0, 4);

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <PageTitle bleed>Shop</PageTitle>
      <DropBanner drop={activeNextDrop()} />
      <ul className="grid gap-6 md:grid-cols-2 md:gap-10">
        {SHOP_CATEGORIES.map((c, i) => (
          <li key={c.slug} data-reveal="item">
            <CategoryCard category={c} index={i} photo={inCategory(products, c.slug).find((p) => p.images[0])?.images[0]} />
          </li>
        ))}
      </ul>

      {latest.length > 0 && (
        <section aria-labelledby="latest" className="mt-20 md:mt-28">
          <h2 id="latest" data-reveal className="mb-8 border-b-2 border-line pb-3 font-drip text-4xl uppercase md:text-5xl">
            Latest off the wall
          </h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-10 lg:grid-cols-4">
            {latest.map((p) => (
              <li key={p.id} data-reveal="item">
                <ProductCard
                  product={p}
                  price={formatPrice(p.price)}
                  edition={editionFor(p.handle, p.productType)}
                  lockedUntil={lockedUntil(p.handle)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
