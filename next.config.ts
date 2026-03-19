import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  compress: true,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // PWA and production optimizations
  poweredByHeader: false,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['react-markdown', 'recharts', 'date-fns'],
  },
};

export default nextConfig;
