import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "emorya.com",
      },
      {
        protocol: "https",
        hostname: "cdn.multiversx.com",
      },
    ],
  },
};

export default nextConfig;
