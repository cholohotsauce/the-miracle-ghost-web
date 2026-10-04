import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos come from Shopify's image CDN
    remotePatterns: [new URL("https://cdn.shopify.com/s/files/**")],
  },
  async redirects() {
    // Aes calls them shows; keep old links working
    return [{ source: "/exhibitions", destination: "/shows", permanent: true }];
  },
};

export default nextConfig;
