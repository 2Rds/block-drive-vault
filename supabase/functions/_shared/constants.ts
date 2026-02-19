export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  PAYMENT_REQUIRED: 402,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

export const TIME_MS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

export const AUTH = {
  RATE_LIMIT_WINDOW_MS: 5 * TIME_MS.MINUTE,
  MAX_ATTEMPTS_PER_WINDOW: 5,
  BLOCK_DURATION_MS: 15 * TIME_MS.MINUTE,
  TIMESTAMP_TOLERANCE_MS: 5 * TIME_MS.MINUTE,
  TOKEN_EXPIRY_HOURS: 24,
  JWT_EXPIRY_HOURS: 24,
  MCA_CHALLENGE_EXPIRY_MS: 10 * TIME_MS.MINUTE,
  MCA_JWT_EXPIRY_SECONDS: 15 * 60,
} as const;

export const SUBSCRIPTION_TIERS = {
  STARTER: { storage: 50, bandwidth: 50, seats: 1 },
  PRO: { storage: 200, bandwidth: 200, seats: 1 },      // 200 GB
  POWER: { storage: 2000, bandwidth: 2000, seats: 1 },  // 2 TB
  GROWTH: { storage: 500, bandwidth: 500, seats: 3 },   // Legacy
  SCALE: { storage: 1000, bandwidth: 1000, seats: 999 }, // 1 TB per seat
  FREE_TRIAL: { storage: 50, bandwidth: 50, seats: 1 },
  DEFAULT: { storage: 1, bandwidth: 1, seats: 1 },
} as const;

export const STRIPE_TIER_THRESHOLDS = {
  STARTER_MAX: 8900,
  PRO_MAX: 49900,
  GROWTH_MAX: 99900,
} as const;

// Tier pricing (cents) — used for subscription verification
export const TIER_PRICING: Record<string, Record<string, number>> = {
  Pro: { monthly: 900, quarterly: 2400, yearly: 8900 },
  Power: { monthly: 4900, quarterly: 13400, yearly: 49900 },
  Scale: { monthly: 2900, quarterly: 7900, yearly: 29900 },
  Enterprise: { monthly: 0, quarterly: 0, yearly: 0 },
};

export const WALLET_ADDRESS_PATTERNS = {
  ETHEREUM: /^0x[a-fA-F0-9]{40}$/,
  SOLANA: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

export const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const BOX_API_BASE = 'https://api.box.com/2.0';
export const SLACK_API_BASE = 'https://slack.com/api';
export const FILEBASE_API = {
  S3_ENDPOINT: 'https://s3.filebase.com',
  PINNING_API: 'https://api.filebase.io/v1/ipfs/pins',
  GATEWAY: 'https://ipfs.filebase.io',
  S3_REGION: 'us-east-1',
} as const;

export const MAX_FILENAME_LENGTH = 200;
export const MAX_FAILED_PAYMENTS = 3;
export const SECURITY_EVENT_THRESHOLD = 5;
