import type { NextConfig } from "next";

const DEFAULT_SERVER_ACTION_ORIGINS = [
  "https://local.dev:3443",
  "http://localhost:3000",
  "https://ventry.m-loeffler.de",
  "https://dev-ventry.m-loeffler.de",
];

const SERVER_ACTION_URL_ENV_KEYS = [
  "BETTER_AUTH_URL",
  "NEXTAUTH_URL",
  "DEV_URL",
  "PROD_URL",
  "PROD_AUTH_URL",
] as const;

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getTrustedOrigins() {
  const origins = new Set(DEFAULT_SERVER_ACTION_ORIGINS);

  for (const key of SERVER_ACTION_URL_ENV_KEYS) {
    const origin = normalizeOrigin(process.env[key]);
    if (origin) {
      origins.add(origin);
    }
  }

  const explicitOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [];
  for (const value of explicitOrigins) {
    const origin = normalizeOrigin(value.trim());
    if (origin) {
      origins.add(origin);
    }
  }

  return [...origins];
}

function validateSecurityConfig() {
  if (!process.env.BETTER_AUTH_URL && !process.env.NEXTAUTH_URL) {
    throw new Error("Missing required environment variables: BETTER_AUTH_URL or NEXTAUTH_URL");
  }
}

// Validate security configuration on startup
try {
  validateSecurityConfig();
} catch (error) {
  console.error('Security Configuration Error:', error);
  process.exit(1);
}

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ['localhost', 'local.dev'],
  cacheComponents: true,
  experimental: {
    serverActions: {
      allowedOrigins: getTrustedOrigins(),
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
      },
      {
        protocol: 'https',
        hostname: 'wcqfkfwzygvzgjqqsezb.supabase.co',
        port: '',
        pathname: '/**'
      }
    ]
  }
};

export default nextConfig;
