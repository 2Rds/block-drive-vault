---
name: Cloudflare MCP Development
description: This skill should be used when the user asks to "create MCP server", "build MCP server on Workers", "deploy MCP server", "extend Claude with tools", or is developing Model Context Protocol servers on Cloudflare.
version: 1.0.0
---

# Cloudflare MCP Development

Create Model Context Protocol (MCP) servers on Cloudflare Workers to extend Claude with custom tools.

## Quick Start

```bash
# Public MCP server (no auth)
npm create cloudflare@latest -- my-mcp-server \
  --template=cloudflare/ai/demos/remote-mcp-authless

# OAuth-protected MCP server
npm create cloudflare@latest -- my-mcp-server \
  --template=cloudflare/ai/demos/remote-mcp-github-oauth
```

## Tool Definition

```typescript
import { MCPServer } from '@anthropic-ai/mcp-server';
import { z } from 'zod';

const server = new MCPServer({ name: 'my-server', version: '1.0.0' });

server.tool(
  'query-database',
  'Query the database',
  {
    query: z.string().describe('SQL query to execute'),
    limit: z.number().optional().describe('Max results')
  },
  async ({ query, limit = 10 }, env) => {
    const { results } = await env.DB.prepare(query).bind(limit).all();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2)
      }]
    };
  }
);
```

## Worker Integration

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return server.handle(request, env);
  }
};
```

## Deployment

```bash
# Deploy to Workers
wrangler deploy

# Test locally
npx @anthropic-ai/mcp-inspector
```

## Claude Configuration

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "url": "https://my-mcp-server.workers.dev/sse"
    }
  }
}
```

## OAuth Support

Supported providers: GitHub, Google, Auth0, Stytch, WorkOS

Configure in wrangler.toml:
```toml
[vars]
OAUTH_PROVIDER = "github"
OAUTH_CLIENT_ID = "your-client-id"
# OAUTH_CLIENT_SECRET set via: wrangler secret put OAUTH_CLIENT_SECRET
```

For more details, see the mcp-architect agent.
