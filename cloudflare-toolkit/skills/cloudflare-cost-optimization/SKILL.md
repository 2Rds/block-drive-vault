---
name: Cloudflare Cost Optimization
description: This skill should be used when the user asks about "Cloudflare costs", "how much will this cost", "optimize costs", "reduce Cloudflare bill", "free tier limits", "pricing", "cost savings", or when implementing features that impact Cloudflare billing. Provides cost awareness and optimization strategies.
version: 1.0.0
---

# Cloudflare Cost Optimization

Cost awareness, pricing breakdown, free tier limits, and optimization strategies for all Cloudflare services.

## Pricing Overview

### Free Tier (Always Available)

**Workers**:
- 100,000 requests/day
- 10ms CPU time per request
- Enough for small-medium apps

**R2**:
- 10GB storage/month
- **Unlimited egress** (always free!)
- 1 million Class A operations/month (write, list)
- 10 million Class B operations/month (read)

**KV**:
- 100,000 reads/day
- 1,000 writes/day
- 1GB storage

**D1**:
- Currently FREE (beta)
- 5GB storage
- 5 million rows read/day

**Pages**:
- Unlimited sites
- Unlimited requests
- 500 builds/month

### Paid Plans

**Workers Paid ($5/month)**:
- 10 million requests/month included
- $0.50 per additional million
- 30s CPU time limit (vs 10ms free)
- 128MB memory (vs 128MB free)
- Worth it if: >100k requests/day

**R2 Storage**:
- $0.015/GB/month storage
- $0 egress (always!)
- Class A operations: $4.50/million
- Class B operations: $0.36/million

**KV Storage**:
- $0.50/GB/month
- $0.50/million reads
- $5/million writes

**Durable Objects**:
- $0.15/million requests
- $0.20/million GB-s (memory duration)
- Most expensive option - use sparingly

## Cost Calculation Examples

### Example 1: Simple API (Free Tier)

**Scenario**: API with 50k requests/day

**Workers**: 50k/day × 30 = 1.5M/month
- Free tier: 100k/day = 3M/month
- **Cost: $0** ✅

**KV** (cache responses): 1M reads/day
- Free tier: 100k reads/day
- Overage: 900k reads/day × 30 = 27M reads/month
- **Cost**: (27M / 1M) × $0.50 = **$13.50/month**

**Total**: $13.50/month

### Example 2: File Storage App

**Scenario**: Store 100GB files, serve 1TB/month

**R2**:
- Storage: 100GB × $0.015 = **$1.50/month**
- Egress: 1TB × $0 = **$0** (FREE!)
- Reads: 10M × ($0.36/1M) = **$3.60/month**

**AWS S3 Comparison**:
- Storage: 100GB × $0.023 = $2.30/month
- Egress: 1TB × $0.09 = **$90/month**
- Total: **$92.30/month**

**Savings with R2**: $90.70/month (98% reduction!)

### Example 3: High-Traffic App

**Scenario**: 10M requests/day

**Workers Paid**:
- Base: $5/month (includes 10M/month)
- Requests: 10M/day × 30 = 300M/month
- Overage: 290M × ($0.50/1M) = **$145/month**
- **Total**: $150/month

**R2** (serve static assets):
- Storage: 50GB × $0.015 = $0.75/month
- Egress: FREE
- **Total**: $0.75/month

**Total**: $150.75/month

## Free Tier Strategies

### Stay Under 100k Requests/Day

**Tactics**:
1. **Cache aggressively**: Reduce Worker invocations by 80-90%
2. **Serve static from R2**: Images, CSS, JS bypass Workers
3. **Use Pages**: Static sites don't count toward Worker requests

**Example**:
```javascript
// Before: 100k requests/day to Worker
// After: 20k requests/day (80k served from cache)

export default {
  async fetch(request, env) {
    const cache = caches.default;

    // Try cache first
    let response = await cache.match(request);
    if (response) return response;  // Doesn't count toward quota!

    // Generate response
    response = await handleRequest(request, env);

    // Cache for 1 hour
    const cacheResponse = response.clone();
    cacheResponse.headers.set('Cache-Control', 'public, max-age=3600');
    await cache.put(request, cacheResponse);

    return response;
  }
};
```

### Stay Under 1k KV Writes/Day

**Tactics**:
1. **Batch writes**: Write once with more data
2. **Use D1 for write-heavy**: Currently free
3. **Aggregate before writing**: Collect data, write periodically

**Example**:
```javascript
// Bad: 1000 writes/day = $0.02/day = $0.60/month
for (const item of items) {
  await env.KV.put(`item:${item.id}`, JSON.stringify(item));
}

// Good: 1 write/day = FREE
await env.KV.put('items:batch', JSON.stringify(items));
```

### Use R2 Instead of S3

**Savings**: $0.09/GB egress

**Example**:
- Serve 10TB/month from R2: FREE egress
- Same on AWS S3: 10,000GB × $0.09 = **$900/month**

## Monitoring Costs

### Dashboard Analytics

**Check usage**:
1. Workers dashboard → Analytics
2. View requests, CPU time, errors
3. Compare to free tier limits

**Set up alerts**:
1. Notifications → Billing
2. Create threshold alert (e.g., $50/month)
3. Get notified at 50%, 75%, 100%

### Cost Breakdown

**Identify expensive components**:
```bash
# Via API
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/billing/usage" \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

**Common culprits**:
- Durable Objects (high request rate)
- KV writes (exceeding 1k/day)
- Workers (exceeding 100k/day)

## Optimization Strategies

### Strategy 1: Cache Everything Possible

**Implementation**:
```javascript
const CACHE_DURATION = 3600;  // 1 hour

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Cache static assets
    if (url.pathname.match(/\\.(jpg|png|css|js)$/)) {
      return cacheAsset(request);
    }

    // Cache API responses
    if (url.pathname.startsWith('/api/')) {
      return cacheAPIResponse(request, env);
    }

    return handleRequest(request, env);
  }
};
```

**Impact**: Reduce Worker invocations by 80-90%

### Strategy 2: Serve Static from R2

**Instead of Workers serving every request**:
```javascript
// Bad: Worker serves images (counts toward quota)
if (url.pathname.startsWith('/images/')) {
  const object = await env.R2.get(url.pathname);
  return new Response(object.body);  // Worker request counted
}

// Good: Direct R2 bucket access (free)
// Setup: R2 bucket with custom domain
// images.your-domain.com → Direct R2 access
// No Worker involved!
```

**Setup**:
1. Create R2 bucket
2. Enable public access or use presigned URLs
3. Configure custom domain
4. All image requests bypass Workers

### Strategy 3: Batch Operations

**KV writes**:
```javascript
// Collect data throughout the day
const dailyStats = {
  pageviews: 0,
  uniqueVisitors: new Set(),
  errors: []
};

// Write once at end of day
await env.KV.put('stats:2024-01-15', JSON.stringify(dailyStats));
```

**Cost**: 1 write instead of 10,000 = saves $50/month

### Strategy 4: Use D1 for Write-Heavy

**When to use D1**:
- > 1k writes/day
- Need transactions
- Relational data

**Example**:
```javascript
// Before: 10k KV writes/day = $45/month
for (const event of events) {
  await env.KV.put(`event:${event.id}`, JSON.stringify(event));
}

// After: D1 (free while in beta)
await env.DB.batch(
  events.map(event =>
    env.DB.prepare('INSERT INTO events VALUES (?, ?)').bind(event.id, event.data)
  )
);
```

### Strategy 5: Minimize Durable Objects

**Durable Objects are expensive**: $0.15/million requests + memory duration

**Use only for**:
- WebSocket connections
- Strong consistency requirements
- Coordination needs

**Avoid for**:
- Simple state (use KV)
- Cached data (use KV)
- Temporary sessions (use KV with TTL)

## Cost Projections

### Projection Formula

**Workers**:
```
Monthly requests = Daily requests × 30
If > 3M: Cost = (Monthly - 3M) / 1M × $0.50
Else: $0
```

**R2**:
```
Storage cost = GB × $0.015
Egress cost = $0 (always free!)
Operations = (Writes / 1M × $4.50) + (Reads / 1M × $0.36)
```

**KV**:
```
If writes > 30k/month:
  Write cost = (Writes - 30k) / 1M × $5

If reads > 3M/month:
  Read cost = (Reads - 3M) / 1M × $0.50
```

### Estimation Tool

Use the `/cloudflare:cost-check` command to analyze current/projected costs based on usage patterns.

## BlockDrive Cost Analysis

### Current Setup

**API Gateway Worker**:
- Estimated: 100k requests/day
- Free tier: ✅
- Cost: $0

**R2 Storage**:
- Estimated: 100GB
- Cost: 100 × $0.015 = $1.50/month

**R2 Egress** (vs S3):
- Estimated: 1TB/month
- Cloudflare: **$0**
- AWS S3: $90/month
- **Savings**: $90/month

**Total**: ~$1.50/month (vs $90+ on AWS)

### Scaling Projections

**At 1M requests/day**:
- Workers: 30M/month → $13.50/month
- R2: 500GB → $7.50/month
- Total: **$21/month**

**At 10M requests/day**:
- Workers Paid: $150/month
- R2: 2TB → $30/month
- Total: **$180/month**

**Compare to AWS**: Would be ~$500+/month due to egress fees

## Best Practices

✅ **DO**:
- Monitor usage weekly
- Set billing alerts
- Use R2 for all file storage (free egress)
- Cache aggressively
- Batch KV writes
- Use D1 for write-heavy workloads

❌ **DON'T**:
- Use Durable Objects unless necessary
- Exceed free tier without monitoring
- Make unnecessary Worker calls
- Write to KV in loops
- Serve large files through Workers

## Cost Alerts Setup

**Via Dashboard**:
1. Notifications → Billing
2. Add notification
3. Set threshold (e.g., $50)
4. Choose notification method (email, webhook)

**Via API**:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/alerting/v3/policies" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{
    "name": "Cost Alert",
    "alert_type": "billing_usage_alert",
    "filters": {
      "threshold": 50
    },
    "mechanisms": {
      "email": [{"id": "your@email.com"}]
    }
  }'
```

For detailed usage monitoring and debugging, see the `cloudflare-observability` skill.
