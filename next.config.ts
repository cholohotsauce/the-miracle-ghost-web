import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos come from Shopify's image CDN. An object pattern, not new URL(): a URL pattern
    // only allows an empty query string, and Shopify photo URLs carry ?v=
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },
  async redirects() {
    // Aes calls them shows; keep old links working
    return [{ source: "/exhibitions", destination: "/shows", permanent: true }];
  },
};

export default nextConfig;
