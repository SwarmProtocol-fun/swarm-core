import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep heavy packages out of the serverless function bundle.
  // Netlify/Vercel will resolve them from node_modules at runtime,
  // preventing cold-start timeouts and 502s from oversized bundles.
  serverExternalPackages: [
    "ethers",
    "@storacha/client",
    "@azure/arm-compute",
    "@azure/arm-network",
    "@azure/arm-containerinstance",
    "@azure/identity",
  ],
  // Skip TS type checking during build to avoid OOM on Netlify.
  // Run `npx tsc --noEmit` locally or in CI for type safety.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
