---
name: Cloudflare Security
description: This skill should be used when the user asks to "configure WAF", "setup WAF rules", "configure Zero Trust", "setup Cloudflare Tunnel", "implement rate limiting", "block attacks", "security best practices", "protect against DDoS", or is implementing security measures on Cloudflare. Provides comprehensive security guidance.
version: 1.0.0
---

# Cloudflare Security

Security best practices and configuration for WAF, Zero Trust, Tunnel, rate limiting, and DDoS protection.

## WAF (Web Application Firewall)

### Managed Rulesets

Enable OWASP protection:
```bash
# Via API
curl -X PUT "https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/phases/http_request_firewall_managed/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{
    "rules": [{
      "action": "execute",
      "expression": "true",
      "action_parameters": {
        "id": "efb7b8c949ac4650a09736fc376e9aee",
        "version": "latest"
      }
    }]
  }'
```

### Custom WAF Rules

**Block SQL Injection**:
```
(http.request.uri.query contains "SELECT" and http.request.uri.query contains "FROM") or
(http.request.uri.query contains "UNION" and http.request.uri.query contains "SELECT")
```

**Block XSS**:
```
http.request.uri.query contains "<script" or
http.request.uri.query contains "javascript:" or
http.request.body.raw contains "<script"
```

**Rate Limit Auth Endpoints**:
```
(http.request.uri.path contains "/auth/login" and
rate(http.request.ip, 5) > 10)
```

### Common WAF Patterns

```javascript
// Pattern 1: Block by country
(ip.geoip.country in {"CN" "RU"})

// Pattern 2: Challenge suspicious User-Agents
(http.user_agent contains "bot" or http.user_agent contains "crawler")

// Pattern 3: Protect upload endpoints
(http.request.uri.path eq "/api/upload" and http.request.method eq "POST")

// Pattern 4: Hotlink protection
(http.request.uri.path matches "\\.(jpg|jpeg|png|gif)$" and
not http.referer contains "your-domain.com")
```

## Zero Trust

### Setup with Identity Provider

**Clerk OIDC Integration**:
```json
{
  "name": "Clerk",
  "type": "oidc",
  "config": {
    "client_id": "your-clerk-client-id",
    "client_secret": "your-clerk-secret",
    "auth_url": "https://your-domain.clerk.accounts.dev/oauth/authorize",
    "token_url": "https://your-domain.clerk.accounts.dev/oauth/token",
    "certs_url": "https://your-domain.clerk.accounts.dev/.well-known/jwks.json"
  }
}
```

### Access Policies

**Admin Dashboard Protection**:
```json
{
  "name": "Admin Dashboard",
  "application_domain": "admin.your-domain.com",
  "policies": [{
    "name": "Allow Admins Only",
    "decision": "allow",
    "include": [{
      "email": ["admin@your-domain.com"]
    }],
    "require": [{
      "email_domain": ["your-domain.com"]
    }]
  }]
}
```

**API Access Control**:
```json
{
  "name": "API Access",
  "policies": [{
    "name": "Require Authentication",
    "decision": "allow",
    "include": [{
      "everyone": true
    }],
    "require": [{
      "auth_method": "identity_provider"
    }]
  }]
}
```

## Cloudflare Tunnel

### Setup

```bash
# Install cloudflared
# Windows: Download from cloudflare.com
# Mac: brew install cloudflare/cloudflare/cloudflared
# Linux: Download deb/rpm

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create my-tunnel

# Configure tunnel
cat > ~/.cloudflared/config.yml <<EOF
tunnel: my-tunnel-id
credentials-file: /path/to/credentials.json

ingress:
  - hostname: app.example.com
    service: http://localhost:3000
  - hostname: api.example.com
    service: http://localhost:8080
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns my-tunnel app.example.com

# Run tunnel
cloudflared tunnel run my-tunnel
```

### As a Service (Production)

```bash
# Install as service
cloudflared service install

# Start service
cloudflared service start
```

## Rate Limiting

### In Workers

```javascript
export default {
  async fetch(request, env) {
    const ip = request.headers.get('CF-Connecting-IP');
    const key = `ratelimit:${ip}`;

    // Get current count
    const count = parseInt(await env.KV.get(key) || '0');

    // Check limit
    if (count >= 100) {
      return new Response('Rate limit exceeded', {
        status: 429,
        headers: { 'Retry-After': '60' }
      });
    }

    // Increment
    await env.KV.put(key, (count + 1).toString(), {
      expirationTtl: 60  // 1 minute window
    });

    return handleRequest(request, env);
  }
};
```

### Via Dashboard Rules

Create rate limiting rule:
- **Characteristics**: IP Address
- **Period**: 60 seconds
- **Requests**: 100
- **Action**: Block
- **Duration**: 60 seconds

## DDoS Protection

### Automatic Protection

Cloudflare automatically protects against:
- Layer 3/4 DDoS (network/transport)
- Layer 7 DDoS (application)
- Volumetric attacks

### Under Attack Mode

**Enable when under attack**:
```bash
# Via API
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/security_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{"value":"under_attack"}'
```

**Effect**: Shows 5-second JavaScript challenge before allowing access

**Disable after attack subsides**:
```bash
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/security_level" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -d '{"value":"medium"}'
```

## Bot Management

### Challenge Bad Bots

```
(cf.bot_management.score lt 30)
```

**Actions**:
- **Block**: Deny access completely
- **Challenge**: Show CAPTCHA
- **JS Challenge**: Require JavaScript execution
- **Log**: Allow but log for analysis

### Verified Bots

Allow good bots (Google, Bing):
```
(cf.bot_management.verified_bot eq true)
```

## API Shield

### mTLS (Mutual TLS)

**Require client certificates**:
1. Upload client CA certificate to Cloudflare
2. Create mTLS rule:
   ```
   (http.request.uri.path contains "/api/")
   ```
3. Action: Require valid client certificate

### Schema Validation

**Define API schema** (OpenAPI/Swagger):
```yaml
paths:
  /api/users:
    post:
      parameters:
        - name: email
          required: true
          schema:
            type: string
            format: email
```

**Enable validation**: Blocks requests that don't match schema

## Security Headers

### In Workers

```javascript
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

export default {
  async fetch(request, env) {
    const response = await handleRequest(request, env);

    // Add security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }
};
```

## Best Practices for BlockDrive

### WAF Configuration

**Location**: `/cloudflare/waf-rules.json`

**Key rules**:
1. Block SQL injection
2. Block XSS attempts
3. Rate limit auth endpoints (10 req/min)
4. Rate limit upload endpoints (50 req/min)
5. Challenge suspicious user agents
6. Hotlink protection for files

### Zero Trust Policies

**Location**: `/cloudflare/zero-trust-policies.json`

**Policies**:
1. Admin dashboard: Clerk OIDC authentication
2. API access: Valid JWT tokens
3. Premium features: Paid users only

### API Gateway Worker

**Location**: `/workers/api-gateway/`

**Security features**:
- Rate limiting per IP
- CORS validation
- Security headers
- Request logging
- Input sanitization

## Security Incident Response

### Step 1: Assess

```bash
# Check security events
# Dashboard → Security → Events

# View blocked requests
# Look for patterns: IPs, paths, methods
```

### Step 2: Immediate Mitigation

```bash
# Enable Under Attack Mode
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/security_level" \
  -d '{"value":"under_attack"}'

# Or block specific IPs
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/firewall/access_rules/rules" \
  -d '{
    "mode": "block",
    "configuration": {
      "target": "ip",
      "value": "malicious.ip.address"
    }
  }'
```

### Step 3: Create Targeted Rules

**For credential stuffing**:
```
(http.request.uri.path eq "/auth/login" and
rate(http.request.ip, 5) > 5)
```

**For scraping**:
```
(http.request.uri.query contains "page=" and
rate(http.request.ip, 10) > 50)
```

### Step 4: Monitor

- Watch Analytics → Security
- Set up notifications for high block rates
- Review Logpush exports for patterns

## Troubleshooting

**Legitimate traffic blocked**: Check Security → Events, identify false positives, add exception rules

**Rate limiting too aggressive**: Increase thresholds or add exceptions for trusted IPs

**Zero Trust login failing**: Verify IdP configuration, check callback URLs, test IdP independently

**Tunnel not connecting**: Check credentials file path, verify network connectivity, check cloudflared logs

For cost optimization of security features, see `cloudflare-cost-optimization` skill.
