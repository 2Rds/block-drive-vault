---
name: Cloudflare Performance Optimization
description: This skill should be used when the user asks to "optimize performance", "improve caching", "speed up my app", "reduce latency", "configure Argo", "setup tiered caching", or is working on performance improvements for Cloudflare-hosted applications.
version: 1.0.0
---

# Cloudflare Performance Optimization

Performance optimization strategies for Cloudflare infrastructure including caching, Argo Smart Routing, and edge optimization.

## Caching Strategies

### Cache-Control Headers
```javascript
// Cache static assets aggressively
if (url.pathname.match(/\\.(jpg|png|css|js|woff2)$/)) {
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
}

// Cache API responses briefly
if (url.pathname.startsWith('/api/')) {
  response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
}
```

### Cache API in Workers
```javascript
const cache = caches.default;

// Check cache first
let response = await cache.match(request);
if (response) return response;

// Generate response
response = await fetch(request);

// Cache for future
await cache.put(request, response.clone());
return response;
```

### Tiered Caching
Enable in dashboard: Caching → Tiered Cache
- Reduces origin requests by 80%
- Improves cache hit ratio
- FREE on all plans

## Argo Smart Routing

**What it does**: Routes requests through Cloudflare's fastest network paths
**Performance improvement**: ~30% faster on average
**Cost**: ~$0.10/GB
**When to use**: Global audience, performance critical apps

Enable: Traffic → Argo → Enable Argo Smart Routing

## Image Optimization

### Polish (Automatic)
Enable: Speed → Optimization → Polish (Lossless or Lossy)
- Automatic WebP conversion
- Compression optimization
- FREE

### Cloudflare Images (Paid)
```javascript
// Resize and optimize on-the-fly
const url = `https://example.com/cdn-cgi/image/width=800,quality=80/image.jpg`;
```

## Early Hints (103 Response)
```javascript
// Send Early Hints for critical resources
return new Response('Loading...', {
  status: 103,
  headers: {
    'Link': '</styles.css>; rel=preload; as=style, </script.js>; rel=preload; as=script'
  }
});
```

## Load Balancing

Configure multiple origins for:
- Geographic steering (route to nearest origin)
- Failover (automatic failback if origin fails)
- Health checks (monitor origin health)

Setup: Traffic → Load Balancing

For detailed cost analysis, see `cloudflare-cost-optimization` skill.
