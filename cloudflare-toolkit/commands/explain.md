---
name: explain
description: Explain Cloudflare concepts in simple terms for non-technical founders
allowed-tools: []
argument-hint: "<concept>"
---

Explain Cloudflare concepts clearly for non-technical users.

## Process

1. **Identify concept**: Extract concept from argument (e.g., "Workers", "R2", "WAF")

2. **Provide simple explanation**:
   - What it is (in non-technical terms)
   - Why you'd use it
   - When to use it
   - Cost implications
   - Common use cases
   - Simple example

3. **Use analogies**: Explain technical concepts with real-world analogies

4. **Show next steps**: What the user can do with this knowledge

## Examples

**Concept**: Workers
**Explanation**:
```
Workers are like tiny servers that run your code close to users worldwide.

Think of it like this: Instead of having one restaurant in your city,
imagine having a small kiosk in every city that can serve customers instantly.

Why use Workers:
- Faster response times (code runs near users)
- No servers to manage (Cloudflare handles it)
- Auto-scaling (handles 1 or 1 million requests)
- Very cheap (100k requests/day free)

Use Workers for:
- API endpoints
- Processing requests before they reach your server
- Adding security (rate limiting, authentication)
- A/B testing

Cost: Free for most small apps (100k requests/day)

Next steps: Try '/cloudflare:new-worker' to create your first Worker
```

## Supported Concepts

- Workers, R2, KV, D1, Durable Objects, Queues
- WAF, Zero Trust, Tunnel, Rate Limiting
- Caching, CDN, Argo
- Agents SDK, MCP
- Any Cloudflare term

**If concept unknown**: Provide general Cloudflare explanation and suggest `/cloudflare:getting-started` skill.
