# BlockDrive Coding Agent

A Claude Agent SDK application for assisting with BlockDrive development tasks. This agent can read files, edit code, run commands, search the codebase, and provide code reviews.

## Features

- **File Operations**: Read, write, and edit files in the codebase
- **Code Search**: Use Glob and Grep to search through code
- **Command Execution**: Run bash commands for testing and builds
- **Web Research**: Search and fetch documentation from the web
- **Task Tracking**: Track progress with built-in todo lists
- **Blockchain Data**: Access blockchain data through Alchemy MCP server
- **Context-Aware**: Understands BlockDrive's React + TypeScript + Web3 architecture

## Prerequisites

- Node.js 18+ installed
- An Anthropic API key ([get one here](https://console.anthropic.com/))

## Setup

1. **Install dependencies:**
   ```bash
   cd agent
   npm install
   ```

2. **Set your API key:**
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your API key:
   ```
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

3. **Verify installation:**
   ```bash
   npm run typecheck
   ```

## Usage

### Running the Agent

```bash
npm start "Your task description here"
```

### Examples

**Analyze project structure:**
```bash
npm start "List all TypeScript files in the src directory and provide an overview"
```

**Code review:**
```bash
npm start "Review the wallet integration code for security issues"
```

**Find specific code:**
```bash
npm start "Find all places where we call the Supabase client"
```

**Generate code:**
```bash
npm start "Create a new React component for displaying blockchain transaction history"
```

**Run tests:**
```bash
npm start "Run the test suite and analyze any failures"
```

## Configuration

### Environment Variables

Create a `.env` file from `.env.example` and configure:

- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `ALCHEMY_API_KEY`: Your Alchemy API key (optional, for blockchain features)

### Permission Modes

The agent uses `"default"` permission mode, which will ask for confirmation before making file changes. You can modify this in `src/index.ts`:

- `"default"`: Ask for confirmation (safest)
- `"acceptEdits"`: Auto-accept file edits (faster)
- `"bypassPermissions"`: Skip all permissions (CI/CD use)

### Available Tools

The agent has access to:
- **Read**: Read any file
- **Write**: Create new files
- **Edit**: Modify existing files
- **Bash**: Run terminal commands
- **Glob**: Find files by pattern
- **Grep**: Search file contents
- **WebSearch**: Search the web
- **WebFetch**: Fetch web pages
- **TodoWrite**: Track tasks

### MCP Servers

The agent connects to the following MCP servers:

- **Alchemy MCP**: Provides blockchain data access
  - Query wallet balances and transactions
  - Get NFT metadata and ownership
  - Access smart contract data
  - Retrieve token prices and information
  - Monitor blockchain events

## Development

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Running Built Code

```bash
node dist/index.js "Your task"
```

## Project Context

The agent is pre-configured with knowledge about BlockDrive:

- React + TypeScript + Vite application
- Web3 technologies for blockchain integration
- Multiple wallet integrations (Ethereum, Solana)
- Supabase backend services
- Emphasis on security for blockchain operations

## Troubleshooting

### "API key not set" error

Make sure you've created a `.env` file with your `ANTHROPIC_API_KEY`:

```bash
cp .env.example .env
# Edit .env and add your key
```

### TypeScript errors

Run type checking to identify issues:

```bash
npm run typecheck
```

### "claude-code not found"

The SDK will automatically use its bundled Claude Code executable. This warning can be ignored.

## Architecture

```
agent/
├── src/
│   └── index.ts          # Main agent entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment variable template
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Resources

- [Claude Agent SDK Documentation](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
- [TypeScript SDK Reference](https://platform.claude.com/docs/en/api/agent-sdk/typescript)
- [Agent SDK Examples](https://github.com/anthropics/claude-agent-sdk-demos)

## License

ISC
