import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@arachne/web",
    "@arachne/shared",
  ],
};

export default nextConfig;
