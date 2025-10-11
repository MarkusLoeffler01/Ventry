import type { NextConfig } from "next";
import { validateSecurityConfig } from "./src/lib/security/config";

// Validate security configuration on startup
try {
  validateSecurityConfig();
} catch (error) {
  console.error('Security Configuration Error:', error);
  process.exit(1);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', 'local.dev'],
  experimental: {
    serverActions: {
      allowedOrigins: ['https://local.dev:3443', 'http://localhost:3000'],
    },
    serverSourceMaps: true,
  },
  /* config options here */
  images: {
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'github.githubassets.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'itpwjkidppeoypefvvxe.supabase.co',
        port: '',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
