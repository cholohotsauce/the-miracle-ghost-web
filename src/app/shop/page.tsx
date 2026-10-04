import type { Metadata } from "next";
import ProductCard from "@/components/shop/ProductCard";
import NextDropCard from "@/components/shop/NextDropCard";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import { activeNextDrop, editionFor, lockedUntil } from "@/content/drops";
import { formatPrice, getProducts } from "@/lib/shopify";

// Ask Shopify for fresh prices and stock at most once a minute (same as CATALOG_REVALIDATE)
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop",
  description: "Original paintings and drops from The Miracle Ghost. One of one, straight from the wall.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage() {
  const products = await getProducts();
  const drop = activeNextDrop();

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-24 md:pt-32 px-5 md:px-6 lg:px-12 pb-page">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-line pb-4 md:mb-12">
        <h1 className="text-4xl font-black uppercase leading-none tracking-widest md:text-6xl">Shop</h1>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-foreground/60">
          {String(products.length).padStart(2, "0")} pieces · Originals
        </p>
      </header>

      {drop && <NextDropCard drop={drop} />}

      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:gap-x-10 lg:grid-cols-4 touch-pan-y">
        {products.map((product, i) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              price={formatPrice(product.price)}
              edition={editionFor(product.handle, product.productType)}
              lockedUntil={lockedUntil(product.handle)}
              priority={i < 2}
            />
          </li>
        ))}
      </ul>

      {!drop && (
        <section className="mt-16 max-w-md border-t-2 border-line pt-8 md:mt-24">
          <EarlyAccessForm from="shop" prompt="Next drop: get on the list. The ghost tells you first." />
        </section>
      )}
    </main>
  );
}
