import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/spotify-jukebox',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
