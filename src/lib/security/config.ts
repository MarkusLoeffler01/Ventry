// Security configuration for production deployments
export const SECURITY_CONFIG = {
  // JWT Security
  JWT_MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  JWT_UPDATE_AGE: 24 * 60 * 60, // 24 hours
  
  // Password Security
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MIN_STRENGTH: 2, // zxcvbn score
  
  // Rate Limiting
  RATE_LIMIT_MAX: 100, // requests per window
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  
  // Session Security
  SECURE_COOKIES: process.env.NODE_ENV === 'production',
  SAME_SITE: 'lax' as const,
  
  // Headers
  SECURITY_HEADERS: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  },
  
  // Content Security Policy
  CSP: process.env.NODE_ENV === 'production' ? 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self';" :
    undefined,
    
  // OAuth Security
  OAUTH_ALLOWED_DOMAINS: ['google.com', 'github.com'], // Restrict OAuth domains if needed
} as const;

// Enforce OAuth domain restriction
export function isOAuthDomainAllowed(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return SECURITY_CONFIG.OAUTH_ALLOWED_DOMAINS.some(allowed =>
    domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

export const getSecurityHeaders = () => {
  const headers = new Headers();
  
  Object.entries(SECURITY_CONFIG.SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  
  if (SECURITY_CONFIG.CSP) {
    headers.set('Content-Security-Policy', SECURITY_CONFIG.CSP);
  }
  
  return headers;
};

// Validate environment variables on startup
export const validateSecurityConfig = () => {
  const required = ['AUTH_SECRET', 'BETTER_AUTH_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters long');
  }
};