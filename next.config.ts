import type { NextConfig } from "next";

const basePath = process.env.NODE_ENV === "production" ? "/wedding" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  reactStrictMode: true,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
