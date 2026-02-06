import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Next.js 16+ prefers `remotePatterns`; keep `domains` for compatibility.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
    domains: ['res.cloudinary.com', 'images.unsplash.com'], // Add any other domains if needed
  },
};

export default nextConfig;
