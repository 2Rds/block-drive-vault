# Cloudflare Toolkit Plugin

Complete Cloudflare infrastructure toolkit for Claude Code. Designed for maximum automation and non-technical founders learning as they build.

## Overview

This plugin provides comprehensive support for the entire Cloudflare stack:
- **Workers Platform**: Workers, Durable Objects, KV, D1, Queues, R2
- **Security**: WAF, Zero Trust, Tunnel, DDoS protection, Bot Management
- **Performance**: Caching, Argo Smart Routing, optimization
- **AI Development**: Agents SDK, MCP server development
- **Observability**: Analytics, Logpush, monitoring, debugging
- **Cost Optimization**: Free tier awareness, cost tracking, optimization strategies

## Features

### 🤖 4 Specialized Agents
- **cloudflare-expert**: Full-spectrum Cloudflare engineer
- **waf-security-engineer**: Security rule configuration specialist
- **worker-optimizer**: Performance and cost optimization expert
- **mcp-architect**: MCP server design and implementation specialist

### 📚 8 Auto-Activating Skills
- **cloudflare-workers**: Workers, Durable Objects, KV, D1, R2 development
- **cloudflare-security**: WAF rules, Zero Trust, security best practices
- **cloudflare-performance**: Caching strategies, optimization techniques
- **cloudflare-agents-sdk**: Building stateful AI agents on Cloudflare
- **cloudflare-mcp-development**: Creating MCP servers on Workers
- **cloudflare-cost-optimization**: Pricing awareness, cost strategies
- **cloudflare-observability**: Analytics, monitoring, debugging
- **cloudflare-getting-started**: Basics for beginners

### ⚡ 11 Slash Commands
- `/cloudflare:deploy` - Deploy Worker to Cloudflare
- `/cloudflare:tail` - Watch live Worker logs
- `/cloudflare:new-worker` - Scaffold new Worker project
- `/cloudflare:new-mcp-server` - Scaffold MCP server on Workers
- `/cloudflare:new-agent` - Scaffold Cloudflare Agent SDK project
- `/cloudflare:setup-waf` - Configure WAF rules interactively
- `/cloudflare:setup-r2` - Create and configure R2 bucket
- `/cloudflare:cost-check` - Analyze current/projected costs
- `/cloudflare:purge-cache` - Clear Cloudflare cache
- `/cloudflare:setup-tunnel` - Configure Cloudflare Tunnel
- `/cloudflare:explain` - Explain Cloudflare concepts simply

### 🔒 Smart Hooks
- **wrangler.toml validation**: Auto-validates syntax before saving
- **Deploy cost warnings**: Shows cost impact before deployment
- **Security scanning**: Checks Worker code for vulnerabilities
- **Setup assistance**: Guides first-time setup on session start

### 🌐 MCP Server Integration
Access to all 15 Cloudflare MCP servers:
- cf-docs, cf-bindings, cf-builds, cf-observability, cf-radar
- cf-containers, cf-browser, cf-logpush, cf-ai-gateway, cf-autorag
- cf-audit-logs, cf-dns-analytics, cf-dex, cf-casb, cf-graphql

## Installation

### For BlockDrive Project (Local)
Already installed in this project! The plugin is located at:
```
cloudflare-toolkit/
```

### For Other Projects (User Plugins)
Copy to user plugins directory:
```bash
cp -r cloudflare-toolkit ~/.claude/plugins/
```

Or use the version already in `~/.claude/plugins/cloudflare-toolkit/`

## Configuration

Create `.claude/cloudflare.local.md` with your settings:

```yaml
---
cloudflare_account_id: "your-account-id"
cloudflare_api_token: "your-api-token"
default_zone_id: "your-zone-id"
default_worker_name: "my-worker"
preferred_region: "us-east-1"
enable_cost_warnings: true
---

# Cloudflare Configuration

Optional notes about your Cloudflare setup...
```

**All fields are optional**. The plugin will prompt you when it needs specific configuration.

## Usage

### Getting Started
Just ask Claude about Cloudflare tasks:
- "Deploy my Worker to Cloudflare"
- "How do I set up WAF rules?"
- "What will this cost on Cloudflare?"
- "Create a new MCP server"

The plugin's skills auto-activate based on context, and agents proactively offer assistance.

### Slash Commands
Use commands for specific workflows:
```
/cloudflare:deploy
/cloudflare:setup-waf
/cloudflare:cost-check
```

### Agents
Agents automatically trigger when relevant, or invoke explicitly:
- "Use the cloudflare-expert to help me optimize this Worker"
- "Have the waf-security-engineer review my security rules"

## BlockDrive-Specific Features

This plugin includes special support for BlockDrive:
- Quick deploy for API gateway Worker
- BlockDrive WAF rule templates
- R2 bucket configuration for encrypted storage
- Cost tracking for BlockDrive infrastructure

## Prerequisites

- **Node.js** 18+ (for utility scripts)
- **Wrangler CLI** (Cloudflare Workers CLI)
  ```bash
  npm install -g wrangler
  ```
- **Cloudflare Account** with API token

## Cost Awareness

The plugin is designed to keep you aware of costs:
- Warnings before expensive operations
- Free tier tracking
- Cost optimization suggestions
- Projected monthly costs

## Safety Features

- **Confirmation required**: Deploy, cache purge, WAF changes
- **Validation**: Auto-validates config files before saving
- **Security scanning**: Checks for common vulnerabilities
- **Rollback support**: Guides rollback if deployments fail

## Support

- **Documentation**: See `skills/` for detailed guides
- **Examples**: Check `examples/` for working code samples
- **Scripts**: Utility scripts in `scripts/` for automation

## License

MIT License - See LICENSE file
