import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // PWA headers and caching handled at Vercel/CDN layer
  // next-pwa v5 has compatibility issues with App Router;
  // we use a manual service worker registration approach instead.
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
};

export default nextConfig;
