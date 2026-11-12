import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { TEASER_HOSTS } from "@/lib/launch";
import { SITE_URL } from "@/lib/site";

/**
 * Search engines may read only the public domain. The Vercel addresses (staging and previews) carry a full
 * copy of the site, so there they are told to stay out; otherwise Google can list the copy instead of the real one.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
  if (!TEASER_HOSTS.includes(host)) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
