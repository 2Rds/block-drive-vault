---
name: new-worker
description: Scaffold a new Cloudflare Worker project with best practices
allowed-tools: [Bash, Write, AskUserQuestion]
argument-hint: "[project-name]"
---

Create a new Cloudflare Worker project with proper structure.

## Process

1. **Get project name**: From argument or ask user

2. **Create project**:
   - Run: `npm create cloudflare@latest {project-name}`
   - Let template wizard run (user chooses TypeScript/JavaScript, etc.)

3. **Navigate and show structure**:
   - `cd {project-name}`
   - Show created files and explain each

4. **Next steps**:
   - "Run `wrangler dev` to test locally"
   - "Use `/cloudflare:deploy` to deploy to Cloudflare"
   - "Edit src/index.ts to customize your Worker"

## Example

```
/cloudflare:new-worker my-api
```

Creates `my-api/` with Worker template, wrangler.toml, and package.json
