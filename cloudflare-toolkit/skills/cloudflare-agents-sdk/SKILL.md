---
name: Cloudflare Agents SDK
description: This skill should be used when the user asks to "build an AI agent", "create a chatbot", "use Cloudflare Agents SDK", "stateful AI agent", "WebSocket agent", or is developing AI agents on Cloudflare infrastructure.
version: 1.0.0
---

# Cloudflare Agents SDK

Build stateful AI agents on Cloudflare using the Agents SDK with Durable Objects, WebSocket support, and persistent state.

## Quick Start

```bash
npm create cloudflare@latest -- my-agent --template=cloudflare/agents-starter
cd my-agent
wrangler dev
```

## Basic Agent

```typescript
import { Agent } from "cloudflare-agents";

export class MyAgent extends Agent {
  initialState = {
    messages: [],
    context: {}
  };

  async onMessage(connection, message) {
    // Process message
    const data = JSON.parse(message);

    // Update state (auto-persisted)
    this.setState({
      ...this.state,
      messages: [...this.state.messages, data]
    });

    // Send response
    connection.send(JSON.stringify({ response: "Received" }));
  }
}
```

## Chat Agent (AI-Powered)

```typescript
import { AIChatAgent } from "cloudflare-agents";

export class ChatBot extends AIChatAgent {
  async onMessage(connection, message) {
    const response = await this.ai.complete({
      model: "@cf/meta/llama-2-7b-chat-int8",
      messages: this.state.messages
    });

    connection.send(response.text);
  }
}
```

## Scheduled Tasks

```typescript
// Run in 60 seconds
this.schedule(60);

// Run at specific time
this.schedule("2024-12-31T23:59:59Z");

// Cron schedule
this.schedule("0 * * * *"); // Every hour
```

## SQLite Queries

```typescript
// Query with template literals (safe from injection)
const users = await this.sql`
  SELECT * FROM users
  WHERE id = ${userId}
  AND active = ${true}
`;
```

## WebSocket Connection

```typescript
// Client-side
const ws = new WebSocket("wss://your-domain.com/agents/MyAgent/instance-id");

ws.onmessage = (event) => {
  console.log(JSON.parse(event.data));
};

ws.send(JSON.stringify({ type: "chat", message: "Hello!" }));
```

For deployment and cost considerations, see `cloudflare-workers` and `cloudflare-cost-optimization` skills.
