import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "12mb",
  },
  serverExternalPackages: ["ffmpeg-static", "sharp"],
};

export default nextConfig;
