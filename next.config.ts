import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from external sources
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.nasa.gov" },
      { protocol: "https", hostname: "**.esa.int" },
      { protocol: "https", hostname: "**.planet.com" },
    ],
  },
  // Empty turbopack config to silence the Turbopack warning
  turbopack: {},
};

export default nextConfig;
