/** Site-wide facts used for links, search engines, and share previews */

/**
 * The public address of the site. Set NEXT_PUBLIC_SITE_URL in Vercel once themiracleghost.com points here;
 * until then, Vercel's own address for the deployment (or staging) is used.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://the-miracle-ghost-web.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "The Miracle Ghost";
export const SITE_DESCRIPTION =
  "The Miracle Ghost: the street artist Aes, out of Miami. Original paintings, drops, shows, and a ghost with an attitude.";

/** Schema.org description of the artist, for search engines */
export const artistJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE_NAME,
  alternateName: "Aes",
  jobTitle: "Artist",
  url: SITE_URL,
  homeLocation: { "@type": "Place", name: "Miami, Florida" },
};

/** Renders JSON-LD safely inside a <script> tag */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
