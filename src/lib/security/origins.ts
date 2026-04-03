const DEFAULT_ORIGINS = [
  "https://local.dev:3443",
  "http://localhost:3000",
  "https://ventry.m-loeffler.de",
  "https://dev-ventry.m-loeffler.de",
];

const ENV_URL_KEYS = [
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

export function getTrustedOrigins(): string[] {
  const origins = new Set(DEFAULT_ORIGINS);

  for (const key of ENV_URL_KEYS) {
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
