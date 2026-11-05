import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Countdown from "@/components/shop/Countdown";
import InquiryForm from "@/components/shop/InquiryForm";
import MerchBuyBox from "@/components/shop/MerchBuyBox";
import ProductCard from "@/components/shop/ProductCard";
import ProductFoldouts from "@/components/shop/ProductFoldouts";
import ProductGallery from "@/components/shop/ProductGallery";
import ProductViewStat from "@/components/shop/ProductViewStat";
import SoldOutStamp from "@/components/shop/SoldOutStamp";
import EarlyAccessForm from "@/components/site/EarlyAccessForm";
import SectionTitle from "@/components/site/SectionTitle";
import TransitionLink from "@/components/site/TransitionLink";
import { editionFor, lockedUntil } from "@/content/drops";
import { SHIPPING } from "@/content/productInfo";
import { categoryOf } from "@/content/shopCategories";
import { DETAIL_FIELDS, formatPrice, getProduct, getProducts } from "@/lib/shopify";
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

  const locked = lockedUntil(product.handle);
  const category = categoryOf(product);
  const isArtwork = category.slug === "artwork";
  const variants = product.variants ?? [];
  // Medium, Year, Dimensions: only the ones Aes filled in on Shopify
  const facts = DETAIL_FIELDS.flatMap((f) => {
    const value = product.details?.[f.key];
    return value ? [{ ...f, value }] : [];
  });
  // More from the same door first, then the rest of the shop
  const others = all
    .filter((p) => p.handle !== product.handle)
    .sort((a, b) => Number(categoryOf(b) === category) - Number(categoryOf(a) === category))
    .slice(0, 4);

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
    <main className="mx-auto w-full max-w-[90rem] min-h-[100dvh] bg-background text-foreground pt-32 md:pt-36 px-5 md:px-6 lg:px-12 pb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(productLd)} />
      <ProductViewStat handle={product.handle} />

      <TransitionLink
        href={`/shop/${category.slug}`}
        curtain={category.label}
        className="mb-6 inline-block font-mono text-xs uppercase tracking-[0.2em] text-foreground/60 underline-offset-4 hover:underline md:mb-10"
      >
        ← Back to {category.label}
      </TransitionLink>

      {isArtwork ? (
        // Aes's artwork mockup (2026-11-05): painting left, facts and the Inquire form right. No price, no cart.
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-14 lg:gap-20">
          <ProductGallery images={product.images} title={product.title} framed>
            {!product.available && !locked && <SoldOutStamp size="lg" />}
          </ProductGallery>

          <section data-reveal className="flex flex-col">
            <p data-scramble className="text-xs uppercase tracking-[0.2em] text-foreground/60">Original artwork</p>
            <h1 className="mt-3 text-4xl uppercase leading-[0.95] md:text-6xl">{product.title}</h1>

            {facts.length > 0 && (
              // Dividers between the facts on wide screens; on a phone they wrap, so no dividers
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-4 md:gap-x-0">
                {facts.map((f, i) => (
                  <div key={f.key} className={`md:pr-10 ${i > 0 ? "md:border-l-2 md:border-foreground md:pl-10" : ""}`}>
                    <dt className="text-xs uppercase tracking-[0.2em]">{f.label}</dt>
                    <dd className="mt-1 text-base md:text-lg">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.description && <p className="mt-6 max-w-prose leading-relaxed text-foreground/80">{product.description}</p>}

            <div className="mt-8 border-t-2 border-foreground pt-8">
              {locked ? (
                <div className="flex flex-col gap-5 border-2 border-line bg-foreground p-5 text-background">
                  <p className="font-drip text-3xl uppercase">The ghost is guarding this one</p>
                  <Countdown to={locked} className="text-[var(--color-neon-green)]" />
                  <div className="[&_input]:border-background [&_input]:bg-foreground [&_input]:text-background [&_button]:bg-[var(--color-neon-green)] [&_button]:text-foreground">
                    <EarlyAccessForm from={`locked-${product.handle}`} prompt="Get told the second it unlocks." />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-5xl uppercase leading-none md:text-6xl">Inquire</h2>
                  <p className="mb-8 mt-4 leading-relaxed">
                    {product.available
                      ? "Submit an inquiry below for availability, pricing and additional information."
                      : "This one found a home. Ask below about similar work or a commission."}
                  </p>
                  <InquiryForm handle={product.handle} title={product.title} />
                </>
              )}
            </div>
          </section>
        </div>
      ) : (
        // Aes's merch mockup (2026-11-05): photos with thumbnails left; price, sizes, green Add to Cart right
        <div className="grid gap-10 md:grid-cols-2 md:gap-14 lg:gap-20">
          {/* A bit smaller than the column, so the thumbnails sit above the fold like the mockup */}
          <div className="mx-auto w-full max-w-[34rem]">
            <ProductGallery images={product.images} title={product.title}>
              {!product.available && !locked && <SoldOutStamp size="lg" />}
            </ProductGallery>
          </div>

          <section data-reveal className="flex flex-col gap-6 md:sticky md:top-32 md:self-start">
            <div>
              <p data-scramble className="text-xs uppercase tracking-[0.2em] text-foreground/60">Merch</p>
              <h1 className="mt-3 text-4xl uppercase leading-[0.95] md:text-6xl">{product.title}</h1>
            </div>

            {product.description && <p className="max-w-prose leading-relaxed text-foreground/80">{product.description}</p>}

            {locked ? (
              <div className="flex flex-col gap-5 border-2 border-line bg-foreground p-5 text-background">
                <p className="font-drip text-3xl uppercase">The ghost is guarding this one</p>
                <Countdown to={locked} className="text-[var(--color-neon-green)]" />
                <div className="[&_input]:border-background [&_input]:bg-foreground [&_input]:text-background [&_button]:bg-[var(--color-neon-green)] [&_button]:text-foreground">
                  <EarlyAccessForm from={`locked-${product.handle}`} prompt="Get told the second it unlocks." />
                </div>
              </div>
            ) : product.available && variants.length > 0 ? (
              <MerchBuyBox
                options={product.options ?? []}
                variants={variants}
                price={formatPrice(product.price, { cents: true })}
                variantPrices={Object.fromEntries(variants.map((v) => [v.id, formatPrice(v.price, { cents: true })]))}
              />
            ) : (
              <div className="flex flex-col gap-4 border-2 border-line p-5">
                <p className="font-drip text-3xl uppercase">Gone. Someone beat you to it.</p>
                <EarlyAccessForm from={`sold-${product.handle}`} prompt="Don't miss the next one." />
              </div>
            )}

            <ProductFoldouts sections={[SHIPPING]} open />
            <p className="text-sm italic text-foreground/80">Personally inspected by the artist before it leaves the studio.</p>
          </section>
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-20 md:mt-28">
          <SectionTitle className="mb-8">More off the wall</SectionTitle>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:gap-x-10 lg:grid-cols-4">
            {others.map((p) => (
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
