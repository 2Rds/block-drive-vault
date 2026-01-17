---
name: Cloudflare Observability
description: This skill should be used when the user asks to "debug a Worker", "view logs", "check analytics", "monitor performance", "trace errors", "setup logging", "wrangler tail", "check metrics", or needs to troubleshoot Cloudflare issues. Provides comprehensive observability and debugging guidance.
version: 1.0.0
---

# Cloudflare Observability

Monitoring, logging, analytics, and debugging for Cloudflare Workers and infrastructure.

## Live Logging with Wrangler Tail

### Basic Usage

```bash
# Tail production logs
wrangler tail

# Pretty formatted
wrangler tail --format=pretty

# Filter by status code
wrangler tail --status=error

# Search for specific text
wrangler tail --search="ERROR"

# Specific environment
wrangler tail --env=production
```

### Console Logging in Workers

```javascript
export default {
  async fetch(request, env) {
    console.log('Request received:', {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers)
    });

    try {
      const response = await handleRequest(request, env);
      console.log('Response sent:', response.status);
      return response;
    } catch (error) {
      console.error('Error occurred:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
};
```

## Workers Analytics

### Dashboard Analytics

**Access**: Workers Dashboard → Your Worker → Analytics

**Key Metrics**:
- **Requests**: Total requests over time
- **Errors**: 4xx and 5xx responses
- **CPU Time**: Execution duration
- **Status Codes**: Breakdown of response codes

### Analytics Engine (Custom Metrics)

**Send custom metrics**:
```javascript
export default {
  async fetch(request, env) {
    const start = Date.now();

    const response = await handleRequest(request, env);

    // Send custom metrics
    env.ANALYTICS.writeDataPoint({
      doubles: [Date.now() - start],  // Response time
      blobs: [request.url, response.status.toString()]
    });

    return response;
  }
};
```

**Query metrics**:
```bash
# Via GraphQL API
curl -X POST "https://api.cloudflare.com/client/v4/graphql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{
    "query": "query { viewer { accounts(filter: {accountTag: \"$ACCOUNT_ID\"}) { analyticsEngineDatasets { ... } } } }"
  }'
```

## Logpush (Export Logs)

### Setup Logpush to R2

**Create Logpush job**:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/jobs" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{
    "destination_conf": "r2://{bucket}/{path}",
    "dataset": "http_requests",
    "logpull_options": "fields=ClientIP,ClientRequestHost,ClientRequestMethod,EdgeResponseStatus,RayID&timestamps=rfc3339"
  }'
```

### Query Exported Logs

```javascript
// Read logs from R2
export default {
  async fetch(request, env) {
    const { objects } = await env.LOGS_BUCKET.list({
      prefix: '2024/01/15/'
    });

    for (const obj of objects) {
      const log = await env.LOGS_BUCKET.get(obj.key);
      const text = await log.text();
      // Parse and analyze logs
    }
  }
};
```

## Error Tracking

### Structured Error Logging

```javascript
async function logError(error, context, env) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    context: {
      url: context.request?.url,
      method: context.request?.method,
      userAgent: context.request?.headers.get('User-Agent'),
      ip: context.request?.headers.get('CF-Connecting-IP')
    }
  };

  // Store in KV or D1
  await env.ERRORS.put(
    `error:${Date.now()}:${crypto.randomUUID()}`,
    JSON.stringify(errorLog),
    { expirationTtl: 86400 * 7 }  // Keep for 7 days
  );

  // Or send to external service (Sentry, etc.)
  await fetch('https://your-error-tracker.com/api/errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(errorLog)
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      ctx.waitUntil(logError(error, { request }, env));
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

### Query Error Logs

```javascript
// List recent errors
const { keys } = await env.ERRORS.list({ prefix: 'error:' });

// Parse and analyze
const errors = await Promise.all(
  keys.map(async (key) => {
    const data = await env.ERRORS.get(key.name);
    return JSON.parse(data);
  })
);

// Group by error type
const errorGroups = errors.reduce((acc, err) => {
  acc[err.message] = (acc[err.message] || 0) + 1;
  return acc;
}, {});
```

## Performance Monitoring

### CPU Time Tracking

```javascript
export default {
  async fetch(request, env) {
    const start = Date.now();

    const response = await handleRequest(request, env);

    const duration = Date.now() - start;

    // Log slow requests
    if (duration > 100) {
      console.warn('Slow request:', {
        url: request.url,
        duration: `${duration}ms`
      });
    }

    return response;
  }
};
```

### Identify Bottlenecks

```javascript
async function timed(name, fn) {
  const start = Date.now();
  const result = await fn();
  console.log(`${name}: ${Date.now() - start}ms`);
  return result;
}

export default {
  async fetch(request, env) {
    // Track each operation
    const user = await timed('fetch-user', () =>
      env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first()
    );

    const items = await timed('fetch-items', () =>
      env.DB.prepare('SELECT * FROM items WHERE user_id = ?').bind(userId).all()
    );

    const response = await timed('render', () =>
      renderTemplate({ user, items })
    );

    return new Response(response);
  }
};
```

## Request Tracing

### Cloudflare Ray ID

Every request gets a unique Ray ID for tracing:

```javascript
export default {
  async fetch(request, env) {
    const rayId = request.headers.get('CF-Ray');
    console.log('Processing request:', rayId);

    // Include in responses for debugging
    return new Response('Success', {
      headers: { 'CF-Ray': rayId }
    });
  }
};
```

**Use Ray ID**: Support tickets, debugging, correlating logs

### Custom Trace IDs

```javascript
export default {
  async fetch(request, env) {
    const traceId = request.headers.get('X-Trace-ID') || crypto.randomUUID();

    console.log('Trace ID:', traceId);

    // Pass to subrequests
    const response = await fetch('https://api.example.com', {
      headers: { 'X-Trace-ID': traceId }
    });

    return new Response(await response.text(), {
      headers: { 'X-Trace-ID': traceId }
    });
  }
};
```

## Debugging Techniques

### Local Development

```bash
# Start dev server with debugging
wrangler dev --local

# Use browser DevTools
# Set breakpoints in Workers code
# Inspect variables and requests
```

### Remote Debugging

```javascript
// Debug flag in production
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === 'true';

    if (debug) {
      return new Response(JSON.stringify({
        env: Object.keys(env),
        headers: Object.fromEntries(request.headers),
        url: request.url,
        method: request.method
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return handleRequest(request, env);
  }
};
```

### Health Check Endpoint

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      // Check all dependencies
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // Check KV
      try {
        await env.KV.get('health-check');
        health.checks.kv = 'ok';
      } catch (e) {
        health.checks.kv = 'error';
        health.status = 'degraded';
      }

      // Check D1
      try {
        await env.DB.prepare('SELECT 1').first();
        health.checks.d1 = 'ok';
      } catch (e) {
        health.checks.d1 = 'error';
        health.status = 'degraded';
      }

      return new Response(JSON.stringify(health), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return handleRequest(request, env);
  }
};
```

## Common Issues & Solutions

### Issue: High Error Rate

**Diagnose**:
```bash
# Check error logs
wrangler tail --status=error

# View analytics
# Dashboard → Analytics → Errors tab
```

**Common causes**:
- Missing environment variables
- Database connection issues
- Timeout errors (CPU limit exceeded)
- Invalid input/requests

### Issue: Slow Performance

**Diagnose**:
```bash
# Check CPU time
wrangler tail --format=pretty
# Look for "CPU Time" field

# View analytics
# Dashboard → Analytics → CPU Time
```

**Solutions**:
- Cache responses
- Optimize database queries
- Stream large responses
- Upgrade to paid plan (30s CPU limit)

### Issue: Requests Not Reaching Worker

**Diagnose**:
- Check DNS settings
- Verify Worker route configuration
- Check WAF rules (not blocking legitimate traffic)

**Fix**:
```bash
# List routes
wrangler routes list

# Check zone settings
curl "https://api.cloudflare.com/client/v4/zones/{zone_id}/workers/routes"
```

### Issue: Missing Environment Variables

**Diagnose**:
```javascript
export default {
  async fetch(request, env) {
    // Log available bindings
    console.log('Available env:', Object.keys(env));

    if (!env.MY_VAR) {
      return new Response('MY_VAR not configured', { status: 500 });
    }
  }
};
```

**Fix**:
```toml
# wrangler.toml
[vars]
MY_VAR = "value"

# Or for secrets:
# wrangler secret put MY_SECRET
```

## MCP Server Observability Tools

Use integrated MCP servers for observability:

**cf-observability**: Real-time metrics and alerts
**cf-logs**: Query and analyze Logpush data
**cf-builds**: Deployment history and status

Access via `/mcp` command in Claude Code.

## Monitoring Best Practices

✅ **DO**:
- Set up health check endpoints
- Log errors with structured data
- Monitor key metrics (errors, latency, throughput)
- Use Ray IDs for request tracing
- Export logs to R2 for analysis
- Set up billing alerts

❌ **DON'T**:
- Log sensitive data (passwords, tokens)
- Over-log (causes performance issues)
- Ignore error patterns
- Skip monitoring in production

## Dashboard Setup

**Key Dashboards to Monitor**:
1. **Workers Analytics**: Request volume, errors, CPU time
2. **Security Events**: WAF blocks, bot challenges
3. **Cache Analytics**: Hit ratio, bandwidth saved
4. **Billing Usage**: Current spend vs limits

**Set up alerts**:
- High error rate (>5%)
- CPU time spikes
- Unusual traffic patterns
- Cost thresholds

For cost monitoring specifically, see `cloudflare-cost-optimization` skill. For security events, see `cloudflare-security` skill.
