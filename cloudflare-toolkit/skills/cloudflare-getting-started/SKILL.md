---
name: Cloudflare Getting Started
description: This skill should be used when the user asks "how do I get started with Cloudflare", "explain Cloudflare basics", "what is Cloudflare", "how does Cloudflare work", "Cloudflare for beginners", or when a non-technical founder needs foundational Cloudflare knowledge. Provides beginner-friendly introduction to Cloudflare concepts, platform components, and common workflows.
version: 1.0.0
---

# Cloudflare Getting Started

Foundational knowledge for non-technical founders learning Cloudflare. This skill provides clear explanations of core concepts, platform components, and common workflows without assuming technical background.

## What is Cloudflare?

Cloudflare is a platform that sits between your website/application and your users. Think of it as a global network that:

1. **Makes your app faster** - Caches content close to users worldwide
2. **Keeps your app secure** - Blocks attacks, bad bots, and malicious traffic
3. **Handles scale** - Serves millions of users without your servers crashing
4. **Reduces costs** - Free bandwidth for cached content (no egress fees from R2)

### The Cloudflare Network

Cloudflare operates 300+ data centers worldwide. When a user visits your app:

1. Request hits nearest Cloudflare data center (not your server)
2. Cloudflare checks if it has cached content
3. If cached: Returns instantly from edge (fast!)
4. If not cached: Fetches from your server, caches it, returns to user

**Result**: Users get faster responses, your server handles less traffic.

## Core Platform Components

### Workers (Edge Functions)

**What they are**: JavaScript/TypeScript code that runs on Cloudflare's edge network (not your server).

**Why use them**:
- Run code close to users (low latency)
- Handle millions of requests (auto-scales)
- No servers to manage (serverless)
- Very cheap (100k requests/day free)

**Common uses**:
- API endpoints
- Request routing/manipulation
- Authentication checks
- Rate limiting
- A/B testing

**Example**: Your BlockDrive API gateway is a Worker that handles rate limiting and CORS before requests reach your main application.

### R2 (Object Storage)

**What it is**: File storage similar to AWS S3, but with **zero egress fees**.

**Why use it**:
- Store files (images, videos, documents, backups)
- **Free bandwidth** when users download (normally $0.09/GB on AWS)
- S3-compatible API (easy migration)
- Integrates perfectly with Workers

**Cost example**:
- AWS S3: 10GB storage ($0.23/mo) + 100GB download ($9/mo) = **$9.23/mo**
- Cloudflare R2: 10GB storage ($0.15/mo) + 100GB download (**$0**) = **$0.15/mo**

**Example**: BlockDrive uses R2 for encrypted file storage with massive cost savings.

### KV (Key-Value Store)

**What it is**: Simple database for storing small pieces of data globally.

**Why use it**:
- Very fast reads (cached globally)
- Perfect for configuration, sessions, cache
- 100k reads/day free
- Eventually consistent (data takes seconds to sync globally)

**When to use**: User sessions, feature flags, cached API responses
**When NOT to use**: Bank balances, inventory counts (use D1 instead)

### D1 (SQLite Database)

**What it is**: Full SQL database that runs at the edge.

**Why use it**:
- Familiar SQL syntax
- ACID transactions (consistent, reliable)
- Perfect for relational data
- Still in beta (free while in beta)

**When to use**: User accounts, transactions, structured data that needs consistency

### Durable Objects

**What they are**: Stateful Workers that maintain persistent state and coordination.

**Why use them**:
- WebSocket connections (chat, real-time apps)
- Coordination (ensuring only one Worker processes something)
- Strongly consistent state
- More expensive than KV (use sparingly)

**Example**: Cloudflare Agents SDK uses Durable Objects to maintain AI agent state across sessions.

### Queues

**What they are**: Message queues for async processing.

**Why use them**:
- Process tasks in background
- Handle traffic spikes
- Batch processing
- Retry failed tasks automatically

**Example**: Process uploaded images (resize, compress) without blocking user uploads.

## Security Components

### WAF (Web Application Firewall)

**What it is**: Automatic protection against common attacks.

**What it blocks**:
- SQL injection
- Cross-site scripting (XSS)
- OWASP Top 10 vulnerabilities
- Known attack patterns

**How it works**: Rules examine requests, block malicious ones before they reach your app.

**Cost**: Free tier includes basic WAF, advanced rules on paid plans.

### Zero Trust

**What it is**: Identity-based access control for your applications.

**Why use it**:
- Secure admin dashboards
- Protect internal tools
- Integrate with Google/Microsoft/Okta for login
- VPN replacement

**Example**: BlockDrive uses Zero Trust with Clerk OIDC to protect admin features.

### Cloudflare Tunnel

**What it is**: Secure connection from Cloudflare to your server **without opening ports**.

**Why use it**:
- No public IP needed
- No firewall configuration
- Encrypted connection
- Easy setup

**When to use**: Exposing local development, securing origin servers.

### Rate Limiting

**What it is**: Automatic throttling of abusive traffic.

**Why use it**:
- Prevent API abuse
- Block credential stuffing
- Limit expensive operations
- Free tier: 10k requests/month

**Example**: BlockDrive API gateway limits auth endpoints to 10 requests/minute per IP.

## Performance Components

### Caching

**What it is**: Storing responses at the edge to serve them faster next time.

**How it works**:
- First request: Fetches from origin, caches at edge
- Subsequent requests: Served from cache (milliseconds instead of seconds)
- Respects HTTP cache headers

**Cost savings**: Reduces origin server load by 80-95%

### Argo Smart Routing

**What it is**: Cloudflare routes requests through its fastest network paths.

**Why use it**:
- 30% faster on average
- Routes around network congestion
- Cost: ~$0.10/GB (on top of free tier)

**When to use**: When performance matters more than cost.

## AI & Development Components

### Cloudflare Agents SDK

**What it is**: Framework for building stateful AI agents on Cloudflare.

**Why use it**:
- Persistent conversation history
- WebSocket support for real-time
- Built on Durable Objects
- Scheduled tasks (cron, delays)
- Embedded SQLite for complex queries

**Example use case**: Customer support chatbot that remembers conversation context.

### MCP Servers on Workers

**What it is**: Model Context Protocol servers running on Cloudflare Workers.

**Why use it**:
- Extend Claude with custom tools
- Deploy globally with one command
- OAuth authentication support
- Free tier covers most use cases

**Example**: The 15 Cloudflare MCP servers in BlockDrive provide Claude with Cloudflare management capabilities.

## Common Workflows

### Workflow 1: Deploy Your First Worker

**Setup** (one-time):
```bash
# Install wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

**Create and deploy**:
```bash
# Create new Worker project
npm create cloudflare@latest my-worker

# Deploy to Cloudflare
cd my-worker
wrangler deploy
```

**Result**: Your Worker is live at `my-worker.your-subdomain.workers.dev`

### Workflow 2: Setup R2 Bucket

**Via wrangler CLI**:
```bash
# Create bucket
wrangler r2 bucket create my-bucket

# Upload file
wrangler r2 object put my-bucket/file.txt --file=./local-file.txt

# List files
wrangler r2 object list my-bucket
```

**Via Worker**:
```javascript
export default {
  async fetch(request, env) {
    // Store file in R2
    await env.MY_BUCKET.put('file.txt', 'Hello World!');

    // Retrieve file from R2
    const object = await env.MY_BUCKET.get('file.txt');
    const text = await object.text();

    return new Response(text);
  }
}
```

### Workflow 3: Configure Basic WAF Rules

**Via Dashboard**:
1. Login to Cloudflare dashboard
2. Select your zone (domain)
3. Security → WAF → Create rule
4. Set conditions (e.g., "Block if country is X")
5. Deploy rule

**Common rules**:
- Block specific countries
- Challenge suspicious user agents
- Block specific URLs
- Rate limit endpoints

### Workflow 4: Setup Zero Trust Access

**Steps**:
1. Go to Zero Trust dashboard
2. Settings → Authentication → Add identity provider
3. Configure Google/Microsoft/Okta
4. Access → Applications → Add application
5. Create access policy (who can access)

**Result**: Users must authenticate before accessing your app.

### Workflow 5: Monitor with Analytics

**Via Dashboard**:
- Analytics → Traffic: Request counts, bandwidth, cache hit ratio
- Analytics → Performance: Response times, error rates
- Security → Events: Blocked requests, threat patterns

**Via Workers Analytics API**:
```javascript
// Get analytics data
const response = await fetch(
  'https://api.cloudflare.com/client/v4/zones/{zone_id}/analytics/dashboard',
  {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  }
);
```

## Cost Management

### Free Tier Limits

**Workers**:
- 100,000 requests/day
- 10ms CPU time per request
- Plenty for small-medium apps

**R2**:
- 10GB storage/month
- Unlimited egress (always free!)
- 1 million Class A operations/month

**KV**:
- 100,000 reads/day
- 1,000 writes/day

**D1**:
- Currently free (beta)

### Paid Tier Pricing

**Workers Paid ($5/month)**:
- 10 million requests/month included
- $0.50 per additional million
- 30s CPU time limit (vs 10ms free)

**R2 Pricing**:
- $0.015/GB storage
- $0 egress (always!)
- Operations: $4.50-$36 per million

**Cost optimization tips**:
1. Use R2 instead of S3 (save 99% on bandwidth)
2. Cache aggressively (reduce Worker invocations)
3. Batch KV writes (stay under 1k/day free limit)
4. Monitor usage in dashboard

### Monitoring Costs

**Dashboard**: Analytics → Billing shows:
- Current month usage
- Projected costs
- Per-service breakdown

**Set up alerts**:
- Notifications → Billing → Create alert
- Get notified at 50%, 75%, 100% of threshold

## Common Patterns for BlockDrive

### Pattern 1: API Gateway Worker

**Purpose**: Rate limiting, CORS, security headers before requests reach your app.

**Location**: `/workers/api-gateway/`

**Key features**:
- Rate limiting (prevent abuse)
- CORS validation (security)
- Security headers (CSP, HSTS)
- Request logging

### Pattern 2: R2 for Encrypted Storage

**Purpose**: Store user files with zero egress costs.

**Setup**:
```javascript
// Upload encrypted file
await env.STORAGE_BUCKET.put(
  `users/${userId}/files/${fileId}`,
  encryptedData,
  {
    httpMetadata: {
      contentType: file.type
    }
  }
);
```

**Cost savings**: Serving 1TB/month from R2 vs S3 saves ~$90/month.

### Pattern 3: WAF for Security

**BlockDrive WAF rules**:
- Block SQL injection attempts
- Challenge suspicious user agents
- Rate limit auth endpoints (10 req/min)
- Rate limit upload endpoints (50 req/min)

**Location**: `/cloudflare/waf-rules.json`

### Pattern 4: Zero Trust with Clerk

**Purpose**: Protect admin features with Clerk OIDC.

**Setup**:
- Identity provider: Clerk
- Application: BlockDrive Admin Dashboard
- Policy: Allow only admin users

**Location**: `/cloudflare/zero-trust-policies.json`

## Troubleshooting Common Issues

### Issue: Worker not updating after deploy

**Cause**: Cache or old version still serving

**Fix**:
```bash
# Force new deployment
wrangler deploy --force

# Purge cache
wrangler purge-cache
```

### Issue: R2 upload failing

**Common causes**:
- File size exceeds Worker memory (100MB limit)
- Missing R2 binding in wrangler.toml

**Fix**:
```toml
# Add to wrangler.toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### Issue: KV write failing "daily limit exceeded"

**Cause**: Exceeded 1,000 writes/day on free tier

**Fix**:
- Batch writes (write once with larger data)
- Upgrade to paid plan
- Use D1 instead for write-heavy use cases

### Issue: WAF blocking legitimate traffic

**Cause**: Rule too aggressive

**Fix**:
1. Security → Events → View blocked requests
2. Identify legitimate requests being blocked
3. Adjust rule conditions or add exception
4. Test thoroughly

### Issue: Zero Trust login failing

**Cause**: Identity provider misconfigured

**Fix**:
1. Check client ID and secret
2. Verify redirect URLs match exactly
3. Test IdP connection independently
4. Check access policy allows user

## Learning Resources

### Official Docs
- **Cloudflare Docs**: https://developers.cloudflare.com
- **Workers Docs**: https://developers.cloudflare.com/workers
- **R2 Docs**: https://developers.cloudflare.com/r2

### MCP Servers
Use the 15 Cloudflare MCP servers integrated in BlockDrive:
- `cf-docs` - Search Cloudflare documentation
- `cf-builds` - Manage deployments
- `cf-observability` - Monitor and debug

See all available servers in `.mcp.json`

### Plugin Skills
This plugin includes specialized skills that auto-activate:
- `cloudflare-workers` - Workers, Durable Objects, KV, D1, R2
- `cloudflare-security` - WAF, Zero Trust, security best practices
- `cloudflare-performance` - Caching, optimization techniques
- `cloudflare-agents-sdk` - Building AI agents on Cloudflare
- `cloudflare-mcp-development` - Creating MCP servers
- `cloudflare-cost-optimization` - Pricing awareness, cost strategies
- `cloudflare-observability` - Analytics, monitoring, debugging

### Plugin Commands
Use slash commands for common tasks:
- `/cloudflare:deploy` - Deploy Worker
- `/cloudflare:new-worker` - Create new Worker project
- `/cloudflare:setup-waf` - Configure WAF rules
- `/cloudflare:setup-r2` - Setup R2 bucket
- `/cloudflare:cost-check` - Analyze costs
- `/cloudflare:explain` - Explain Cloudflare concepts

## Next Steps

1. **If you haven't already**: Install wrangler CLI and login
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Explore BlockDrive's Cloudflare setup**:
   - Review `/workers/api-gateway/` Worker code
   - Check `/cloudflare/waf-rules.json` security rules
   - Examine `/cloudflare/zero-trust-policies.json` access policies

3. **Try deploying a Worker**: Use `/cloudflare:deploy` command

4. **Monitor your usage**: Check Cloudflare dashboard for costs and metrics

5. **Ask for help**: Use `/cloudflare:explain <concept>` to learn specific topics

## Additional Resources

For detailed guides, consult:
- **`references/quick-reference.md`** - Command cheat sheet
- **`references/cost-calculator.md`** - Detailed cost breakdowns
- **`examples/hello-world-worker.js`** - Simple Worker example

The plugin's other skills provide deeper dives into specific areas. This skill provides the foundation - use specialized skills as you dive deeper into specific Cloudflare components.
