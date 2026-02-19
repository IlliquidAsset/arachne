import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@refinedev/nextjs-router",
    "@arachne/web",
    "@arachne/shared",
  ],
};

export default nextConfig;
