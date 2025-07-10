import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Suppress specific React warnings in development
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  webpack(config, { dev }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    
    // Suppress console warnings for known React 19 compatibility issues in development
    if (dev) {
      config.infrastructureLogging = {
        level: 'warn',
      };
    }
    
    return config;
  },
};

export default nextConfig;
