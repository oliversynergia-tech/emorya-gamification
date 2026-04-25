import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/leaderboard/public",
          destination: "/public-leaderboard",
        },
      ],
    };
  },
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
