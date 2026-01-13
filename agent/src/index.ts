import { query } from "@anthropic-ai/claude-agent-sdk";
import "dotenv/config";

/**
 * BlockDrive Coding Agent
 *
 * A basic coding agent that can:
 * - Read and edit files
 * - Run bash commands
 * - Search codebases with Grep and Glob
 * - Provide code review and suggestions
 */

async function main() {
  // Check if API keys are set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Error: ANTHROPIC_API_KEY environment variable is not set");
    console.log("\nPlease set your API key:");
    console.log("  export ANTHROPIC_API_KEY=your_api_key_here");
    console.log("\nGet your API key from: https://console.anthropic.com/");
    process.exit(1);
  }

  if (!process.env.ALCHEMY_API_KEY) {
    console.warn("⚠️  Warning: ALCHEMY_API_KEY environment variable is not set");
    console.log("Blockchain features via Alchemy MCP will be unavailable.");
    console.log("Get your API key from: https://dashboard.alchemy.com/\n");
  }

  // Get the prompt from command line args or use a default
  const userPrompt = process.argv.slice(2).join(" ") ||
    "List all TypeScript files in the current directory and provide a brief overview of the project structure.";

  console.log("🤖 BlockDrive Coding Agent");
  console.log("=" .repeat(50));
  console.log(`📝 Task: ${userPrompt}\n`);

  try {
    // Configure the agent with coding-specific tools and permissions
    const result = query({
      prompt: userPrompt,
      options: {
        // Load project settings including CLAUDE.md files
        settingSources: ["project"],

        // Allow essential tools for coding tasks
        allowedTools: [
          "Read",      // Read files
          "Write",     // Create new files
          "Edit",      // Edit existing files
          "Bash",      // Run commands
          "Glob",      // Find files by pattern
          "Grep",      // Search file contents
          "WebSearch", // Search the web for documentation
          "WebFetch",  // Fetch web resources
          "TodoWrite", // Track tasks
        ],

        // Configure MCP servers for blockchain data access
        mcpServers: {
          alchemy: {
            command: "npx",
            args: ["-y", "@alchemy/mcp-server"],
            env: {
              ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || "",
            },
          },
        },

        // Use Claude Code's default system prompt for coding tasks
        systemPrompt: {
          type: "preset",
          preset: "claude_code",
          // Add custom instructions specific to BlockDrive
          append: `
You are a coding assistant for the BlockDrive project, a blockchain-based storage solution.

Project Context:
- This is a React + TypeScript + Vite application
- Uses Web3 technologies for blockchain integration
- Has multiple wallet integrations (Ethereum, Solana)
- Uses Supabase for backend services
- Has access to blockchain data through Alchemy MCP server

Available Capabilities:
- Query blockchain data (balances, transactions, NFTs, etc.)
- Access smart contract information
- Retrieve token data and prices
- Monitor blockchain events

When working on code:
- Follow existing code patterns and conventions
- Maintain type safety with TypeScript
- Write clear, maintainable code
- Consider security implications, especially for blockchain operations
- Provide explanations for your changes
          `.trim()
        },

        // Set permission mode (options: 'default', 'acceptEdits', 'bypassPermissions')
        // 'default' will prompt for confirmation on file changes
        permissionMode: "default",

        // Working directory (defaults to current directory)
        cwd: process.cwd(),

        // Model to use
        model: "claude-sonnet-4-5",

        // Enable streaming for real-time output
        includePartialMessages: false,
      }
    });

    // Process messages as they arrive
    for await (const message of result) {
      // Handle different message types
      if (message.type === "system" && message.subtype === "init") {
        console.log("✓ Agent initialized");
        console.log(`  Model: ${message.model}`);
        console.log(`  Tools: ${message.tools.join(", ")}`);
        console.log(`  Session ID: ${message.session_id}\n`);
      }
      else if (message.type === "assistant") {
        // Display assistant messages
        for (const block of message.message.content) {
          if (block.type === "text") {
            console.log(`🤖 ${block.text}`);
          } else if (block.type === "tool_use") {
            console.log(`\n🔧 Using tool: ${block.name}`);
          }
        }
      }
      else if (message.type === "result") {
        // Display final results
        console.log("\n" + "=".repeat(50));
        if (message.subtype === "success") {
          console.log("✅ Task completed successfully!\n");
          console.log(message.result);
          console.log(`\n📊 Statistics:`);
          console.log(`  Turns: ${message.num_turns}`);
          console.log(`  Duration: ${(message.duration_ms / 1000).toFixed(2)}s`);
          console.log(`  Cost: $${message.total_cost_usd.toFixed(4)}`);
          console.log(`  Tokens: ${message.usage.input_tokens} in / ${message.usage.output_tokens} out`);
        } else {
          console.log(`❌ Task failed: ${message.subtype}\n`);
          if ("errors" in message && message.errors) {
            message.errors.forEach(error => console.error(`  - ${error}`));
          }
        }
      }
    }

  } catch (error) {
    console.error("\n❌ Error running agent:");
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
      if (error.stack) {
        console.error("\nStack trace:");
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Run the agent
main();
