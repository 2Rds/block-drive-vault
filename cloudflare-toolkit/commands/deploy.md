---
name: deploy
description: Deploy Worker to Cloudflare with confirmation and cost warning
allowed-tools: [Read, Bash, AskUserQuestion]
argument-hint: "[worker-directory]"
---

Deploy a Cloudflare Worker with safety checks and cost awareness.

## Process

1. **Locate wrangler.toml**:
   - If argument provided: Use that directory
   - Otherwise: Look in current directory and common locations (./workers/, ./src/, etc.)
   - Read wrangler.toml to understand Worker configuration

2. **Validate configuration**:
   - Check wrangler.toml syntax is valid
   - Verify required fields (name, main, compatibility_date)
   - Check for bindings (KV, D1, R2, etc.)

3. **Show cost impact**:
   - Calculate estimated monthly cost based on:
     - Current free tier usage
     - Worker request volume (if known from analytics)
     - Storage/database usage
   - Display: "This deployment will cost approximately $X/month"
   - If costs could be high, warn the user

4. **Request confirmation**:
   - Use AskUserQuestion to confirm deployment
   - Show:
     - Worker name
     - Environment (production/staging)
     - Estimated cost
     - Bindings being used
   - Question: "Deploy {worker-name} to Cloudflare?"
   - Options: ["Yes, deploy", "Cancel"]

5. **Deploy**:
   - If confirmed, run: `wrangler deploy`
   - If staging environment exists, ask which environment
   - Show deployment URL when complete
   - Run `wrangler tail --format=pretty` for 10 seconds to show initial logs

6. **Post-deployment**:
   - Display Worker URL
   - Suggest: "Test your Worker at: {url}"
   - Remind about monitoring: "Use /cloudflare:tail to watch live logs"

## Examples

**Basic deployment**:
```
User: /cloudflare:deploy
Assistant: [Finds wrangler.toml, shows cost, requests confirmation, deploys]
```

**Specific directory**:
```
User: /cloudflare:deploy ./workers/api-gateway
Assistant: [Deploys Worker from specified directory]
```

## Error Handling

- **wrangler not found**: Instruct user to install: `npm install -g wrangler`
- **wrangler.toml not found**: Help locate or create it
- **Deployment fails**: Show error, suggest fixes, offer to check logs with /cloudflare:tail

## Safety Features

- Always require confirmation before deploying
- Show cost impact before deploying
- Validate configuration before attempting deploy
- Show logs after deployment to catch immediate errors
