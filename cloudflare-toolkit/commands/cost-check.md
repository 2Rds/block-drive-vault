---
name: cost-check
description: Analyze current and projected Cloudflare costs
allowed-tools: [Bash, Read]
argument-hint: ""
---

Analyze current Cloudflare usage and projected monthly costs.

## Process

1. **Gather usage data**:
   - Run script: `node ${CLAUDE_PLUGIN_ROOT}/scripts/calculate-costs.js`
   - Script fetches usage from Cloudflare API if token configured
   - Or estimates from wrangler.toml configuration

2. **Calculate costs**:
   - Workers: Based on request volume
   - R2: Storage + operations
   - KV: Reads + writes
   - D1: Currently free (beta)
   - Durable Objects: If configured

3. **Display breakdown**:
   ```
   Cloudflare Cost Analysis
   ========================

   Workers:
     Requests: 3M/month (free tier: 3M)
     Cost: $0 ✅

   R2 Storage:
     Storage: 50GB × $0.015 = $0.75/month
     Egress: FREE (would be $45 on AWS S3)
     Operations: $2.50/month
     Total: $3.25/month

   KV:
     Reads: 5M/month ($1/month over free tier)
     Writes: 500/month (free tier: 30k)
     Total: $1/month

   TOTAL: $4.25/month
   Savings vs AWS: ~$43/month
   ```

4. **Provide recommendations**:
   - If approaching free tier limits: Suggest optimizations
   - If costs are high: Suggest cost-saving strategies
   - Reference: "See /cloudflare:explain cost-optimization for strategies"

## Configuration

Requires Cloudflare API token in `.claude/cloudflare.local.md`:
```yaml
---
cloudflare_api_token: "your-token"
cloudflare_account_id: "your-account-id"
---
```

If not configured, provides estimates based on wrangler.toml.
