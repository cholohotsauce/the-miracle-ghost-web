import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShopifyBuyButton from "@/components/ShopifyBuyButton";
import Countdown from "@/components/shop/Countdown";
import ProductCard from "@/components/shop/ProductCard";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductViewStat from "@/components/shop/ProductViewStat";
import SoldOutStamp from "@/components/shop/SoldOutStamp";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import TransitionLink from "@/components/site/TransitionLink";
import { editionFor, lockedUntil } from "@/content/drops";
import { formatPrice, getProduct, getProducts } from "@/lib/shopify";
import { jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";

// Same refresh interval as the Shop grid
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return { title: "Not found" };
  const description =
    product.description ||
    `${product.title}: an original by The Miracle Ghost (Aes), Miami. ${formatPrice(product.price)}.`;
  return {
    title: product.title,
    description,
    alternates: { canonical: `/shop/${handle}` },
    openGraph: {
      type: "website",
      title: `${product.title} | ${SITE_NAME}`,
      description,
      images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
    },
    twitter: { card: "summary_large_image", images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: PageProps<"/shop/[handle]">) {
  const { handle } = await params;
  const [product, all] = await Promise.all([getProduct(handle), getProducts()]);
  if (!product) notFound();

  const price = formatPrice(product.price);
  const edition = editionFor(product.handle, product.productType);
  const locked = lockedUntil(product.handle);
  const others = all.filter((p) => p.handle !== product.handle).slice(0, 4);

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || undefined,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: SITE_NAME },
    category: product.productType || undefined,
    url: `${SITE_URL}/shop/${product.handle}`,
    offers: {
      "@type": "Offer",
      price: product.price.amount.toFixed(2),
      priceCurrency: product.price.currency,
      availability: product.available ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      url: `${SITE_URL}/shop/${product.handle}`,
    },
  };

  return (
    <main className="w-full min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productLd)} />
      <ProductViewStat handle={product.handle} />

      <TransitionLink
        href="/shop"
        curtain="Shop"
        className="mb-6 inline-block font-mono text-xs uppercase tracking-[0.25em] text-foreground/60 underline-offset-4 hover:underline md:mb-10"
      >
        ← Back to the shop
      </TransitionLink>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-14">
        <ProductGallery images={product.images} title={product.title}>
          {!product.available && !locked && <SoldOutStamp size="lg" />}
        </ProductGallery>

        <section className="flex flex-col gap-6 md:sticky md:top-32 md:self-start">
          <div>
            {product.productType && (
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-foreground/60">{product.productType}</p>
            )}
            <h1 className="mt-2 text-4xl font-black uppercase leading-[0.95] tracking-wide md:text-6xl">{product.title}</h1>
          </div>

          <dl className="grid grid-cols-2 gap-px border-2 border-line bg-line font-mono text-sm">
            <div className="bg-background p-3">
              <dt className="text-[10px] uppercase tracking-[0.25em] text-foreground/60">Price</dt>
              <dd className={`mt-1 text-lg font-bold ${product.available ? "" : "line-through opacity-50"}`}>{price}</dd>
            </div>
            <div className="bg-background p-3">
              <dt className="text-[10px] uppercase tracking-[0.25em] text-foreground/60">Edition</dt>
              <dd className="mt-1 text-lg font-bold">{edition ?? "Open"}</dd>
            </div>
          </dl>

          {product.description && <p className="max-w-prose leading-relaxed">{product.description}</p>}

          {locked ? (
            <div className="flex flex-col gap-5 border-2 border-line bg-foreground p-5 text-background">
              <p className="font-drip text-3xl uppercase">The ghost is guarding this one</p>
              <Countdown to={locked} className="text-[var(--color-neon-green)]" />
              <div className="[&_input]:border-background [&_input]:bg-foreground [&_input]:text-background [&_button]:bg-[var(--color-neon-green)] [&_button]:text-foreground">
                <EarlyAccessForm from={`locked-${product.handle}`} prompt="Get told the second it unlocks." />
              </div>
            </div>
          ) : product.available ? (
            <div className="min-h-14">
              <ShopifyBuyButton productId={product.id} layout="button" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 border-2 border-line p-5">
              <p className="font-drip text-3xl uppercase">Gone. Someone beat you to it.</p>
              <EarlyAccessForm from={`sold-${product.handle}`} prompt="Don't miss the next one." />
            </div>
          )}
        </section>
      </div>

      {others.length > 0 && (
        <section className="mt-20 border-t-2 border-line pt-8 md:mt-28">
          <h2 className="mb-8 font-drip text-4xl uppercase md:text-5xl">More off the wall</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-10 lg:grid-cols-4">
            {others.map((p) => (
              <li key={p.id}>
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
