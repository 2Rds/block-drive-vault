# Cloudflare Configuration

This directory contains configuration files for BlockDrive's Cloudflare integration.

## Overview

BlockDrive uses Cloudflare for:
- **R2 Storage**: Primary encrypted file storage (zero egress fees)
- **Workers**: API gateway with rate limiting, CORS, and security
- **IPFS Gateway**: Cached IPFS access via cloudflare-ipfs.com
- **WAF**: Web Application Firewall with OWASP protection
- **Zero Trust**: Access control with Clerk OIDC integration

## Directory Structure

```
cloudflare/
├── README.md                    # This file
├── waf-rules.json              # Custom WAF rule definitions
├── zero-trust-policies.json    # Zero Trust access policies
└── env.example                 # Example environment variables
```

## Setup Steps

### 1. Create Cloudflare Account

1. Sign up at https://cloudflare.com
2. Add your domain (blockdrive.co)
3. Update DNS nameservers

### 2. Configure R2 Storage

1. Navigate to R2 in Cloudflare dashboard
2. Create bucket: `blockdrive-storage`
3. Generate API tokens:
   - Go to R2 > Manage R2 API Tokens
   - Create token with Object Read & Write permissions
4. Copy credentials to `.env`:
   ```
   VITE_R2_ACCOUNT_ID=your-account-id
   VITE_R2_ACCESS_KEY_ID=your-access-key
   VITE_R2_SECRET_ACCESS_KEY=your-secret-key
   VITE_R2_BUCKET_NAME=blockdrive-storage
   ```

### 3. Deploy Workers

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Authenticate:
   ```bash
   wrangler login
   ```

3. Create KV namespace for rate limiting:
   ```bash
   wrangler kv:namespace create "RATE_LIMITS"
   ```

4. Update `workers/api-gateway/wrangler.toml` with namespace ID

5. Deploy:
   ```bash
   cd workers/api-gateway
   npm install
   wrangler deploy
   ```

### 4. Configure IPFS Gateway

Enable Cloudflare IPFS gateway by setting:
```
VITE_USE_CLOUDFLARE_IPFS=true
VITE_CLOUDFLARE_IPFS_GATEWAY=https://cloudflare-ipfs.com
```

### 5. Enable WAF

1. Navigate to Security > WAF
2. Enable Managed Rulesets:
   - Cloudflare Managed Ruleset
   - Cloudflare OWASP Core Ruleset
3. Import custom rules from `waf-rules.json`

### 6. Configure Zero Trust (Optional)

1. Navigate to Zero Trust dashboard
2. Add Clerk as OIDC identity provider:
   - Type: OIDC
   - Auth URL: `https://good-squirrel-87.clerk.accounts.dev/oauth/authorize`
   - Token URL: `https://good-squirrel-87.clerk.accounts.dev/oauth/token`
3. Create access policies from `zero-trust-policies.json`

## Environment Variables

See `env.example` for all required environment variables.

## Cost Estimate

| Service | Free Tier | Pro ($20/mo) |
|---------|-----------|--------------|
| R2 (10TB) | $150/mo | $150/mo |
| Workers | 100k req/day | 10M req/mo |
| WAF | Basic rules | Full OWASP |
| Zero Trust | 50 users | 50 users |

**Savings vs AWS S3**: ~96% reduction in egress costs
