# Getting Started with BlockDrive Agent

## Quick Start

1. **Set up your API key:**
   ```bash
   cd agent
   cp .env.example .env
   ```

   Edit `.env` and add your API key from https://console.anthropic.com/

2. **Run your first agent task:**
   ```bash
   npm start "Analyze the BlockDrive project structure"
   ```

## What Just Happened?

Your BlockDrive Coding Agent setup includes:

✅ **Claude Agent SDK v0.2.5** - The latest version
✅ **TypeScript configuration** - Properly configured for ES modules
✅ **Basic coding agent** - With file operations, code search, and command execution
✅ **Project-aware context** - Understands BlockDrive's architecture
✅ **Environment setup** - Ready for your API key

## Next Steps

### 1. Test the Agent

Try these example tasks:

```bash
# Get an overview of your project
npm start "List all the main TypeScript files and explain the project structure"

# Find specific code
npm start "Find all the wallet integration code"

# Get help with a feature
npm start "Explain how the Supabase integration works"
```

### 2. Customize the Agent

Edit `src/index.ts` to:
- Change the allowed tools
- Modify the system prompt
- Adjust permission modes
- Add custom behavior

### 3. Create Project Instructions

Create a `.claude/CLAUDE.md` file in your project root to give the agent project-specific context:

```markdown
# BlockDrive Project Instructions

## Architecture
- React frontend with TypeScript
- Supabase backend
- Web3 integration for blockchain storage

## Coding Guidelines
- Use TypeScript strict mode
- Follow React best practices
- Secure all blockchain operations
- Test all wallet integrations
```

### 4. Advanced Usage

**Enable streaming for real-time progress:**

Change in `src/index.ts`:
```typescript
includePartialMessages: true
```

**Add custom MCP tools:**

See [MCP Documentation](https://platform.claude.com/docs/en/api/agent-sdk/mcp) for adding custom tools.

**Create specialized subagents:**

Use the `agents` option to define specialized agents for specific tasks.

## Common Tasks

### Code Review
```bash
npm start "Review the authentication implementation for security issues"
```

### Generate Code
```bash
npm start "Create a new component for displaying transaction history"
```

### Debug Issues
```bash
npm start "Help me debug why the wallet connection is failing"
```

### Run Tests
```bash
npm start "Run the test suite and analyze any failures"
```

## Configuration Options

The agent is configured in `src/index.ts` with:

- **Model**: `claude-sonnet-4-5` (latest Sonnet model)
- **Permission Mode**: `default` (asks before file changes)
- **Tools**: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, TodoWrite
- **Context**: BlockDrive project knowledge

## Troubleshooting

**Issue**: "API key not set"
**Solution**: Make sure `.env` file exists with your `ANTHROPIC_API_KEY`

**Issue**: TypeScript errors
**Solution**: Run `npm run typecheck` to identify issues

**Issue**: Slow responses
**Solution**: Consider using a faster model or limiting the working directory scope

## Resources

- [Agent SDK Documentation](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
- [TypeScript Examples](https://github.com/anthropics/claude-agent-sdk-demos)
- [BlockDrive Project Root](../)

## Support

For issues or questions:
1. Check the [main README](README.md)
2. Review the [SDK documentation](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
3. Check the [GitHub examples](https://github.com/anthropics/claude-agent-sdk-demos)

---

**Ready to build?** Run `npm start "Your task here"` and watch your agent work! 🚀
