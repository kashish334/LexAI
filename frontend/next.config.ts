import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  outputFileTracingRoot: undefined,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
};

export default nextConfig;