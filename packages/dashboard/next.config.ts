import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@arachne/web",
    "@arachne/shared",
  ],
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
    config.module.rules.push({ test: /\.wasm$/, type: "asset/resource" });
    return config;
  },
  turbopack: {},
};

export default nextConfig;
