import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/shopify";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();
  const pages = ["", "/shop", "/shows", "/contact", "/archive"].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/shop" ? 0.9 : 0.7,
  }));
  return [
    ...pages,
    ...products.map((p) => ({
      url: `${SITE_URL}/shop/${p.handle}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
      images: p.images.slice(0, 1).map((i) => i.url),
    })),
  ];
}
