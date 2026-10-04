import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Aes calls them shows; keep old links working
    return [{ source: "/exhibitions", destination: "/shows", permanent: true }];
  },
};

export default nextConfig;
