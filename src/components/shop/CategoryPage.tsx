import ProductCard from "@/components/shop/ProductCard";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import PageTitle from "@/components/site/PageTitle";
import TransitionLink from "@/components/site/TransitionLink";
import { editionFor, lockedUntil } from "@/content/drops";
import { SHOP_CATEGORIES, inCategory, type ShopCategorySlug } from "@/content/shopCategories";
import { formatPrice, getProducts } from "@/lib/shopify";

/** The product grid behind one of the Shop's two doors: /shop/merch or /shop/artwork */
export default async function CategoryPage({ slug }: { slug: ShopCategorySlug }) {
  const category = SHOP_CATEGORIES.find((c) => c.slug === slug)!;
  const other = SHOP_CATEGORIES.find((c) => c.slug !== slug)!;
  const products = inCategory(await getProducts(), slug);

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <TransitionLink
        href="/shop"
        curtain="Shop"
        className="mb-4 inline-block font-mono text-xs uppercase tracking-[0.25em] text-foreground/60 underline-offset-4 hover:underline"
      >
        ← Shop
      </TransitionLink>
      <PageTitle aside={`${String(products.length).padStart(2, "0")} ${products.length === 1 ? "piece" : "pieces"}`}>
        {category.label}
      </PageTitle>

      {products.length ? (
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
      ) : (
        <section className="max-w-md">
          <p className="mb-8 font-drip text-3xl uppercase leading-tight md:text-4xl">{category.empty}</p>
          <EarlyAccessForm from={`shop-${slug}`} prompt="Get on the list. The ghost tells you first." />
        </section>
      )}

      <TransitionLink
        href={`/shop/${other.slug}`}
        curtain={other.label}
        className="mt-16 inline-flex items-center gap-3 border-t-2 border-line pt-6 font-drip text-3xl uppercase md:mt-24 md:text-4xl"
      >
        {other.label} <span aria-hidden className="font-sans text-2xl">→</span>
      </TransitionLink>
    </main>
  );
}
