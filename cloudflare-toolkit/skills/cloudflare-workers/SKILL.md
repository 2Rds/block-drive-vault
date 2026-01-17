---
name: Cloudflare Workers Development
description: This skill should be used when the user asks to "create a Worker", "build a Worker", "deploy to Workers", "configure wrangler.toml", "use Durable Objects", "setup KV storage", "use D1 database", "configure R2 bucket", "use Queues", or is working on Cloudflare Workers Platform code. Provides comprehensive guidance for Workers, Durable Objects, KV, D1, R2, and Queues development.
version: 1.0.0
---

# Cloudflare Workers Development

Comprehensive guidance for building applications on Cloudflare Workers Platform including Workers, Durable Objects, KV, D1, R2, and Queues.

## Workers Fundamentals

### Basic Worker Structure

```javascript
export default {
  async fetch(request, env, ctx) {
    // Handle request
    return new Response('Hello World!');
  }
};
```

**Key concepts**:
- `request`: Incoming HTTP request
- `env`: Environment bindings (KV, D1, R2, secrets)
- `ctx`: Execution context for `waitUntil()` and `passThroughOnException()`

### Request Handling

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route based on path
    if (url.pathname === '/api/users') {
      return handleUsers(request, env);
    }

    // Method-based routing
    switch (request.method) {
      case 'GET':
        return handleGet(request);
      case 'POST':
        return handlePost(request);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }
};
```

### Response Creation

```javascript
// JSON response
return new Response(JSON.stringify({ success: true }), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }
});

// Redirect
return Response.redirect('https://example.com', 302);

// Stream response
const { readable, writable } = new TransformStream();
// ... pipe data to writable
return new Response(readable);
```

## KV (Key-Value Storage)

### Configuration (wrangler.toml)

```toml
[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-id"
```

### Basic Operations

```javascript
// Write (eventually consistent, takes seconds to propagate globally)
await env.MY_KV.put('key', 'value');
await env.MY_KV.put('user:123', JSON.stringify({ name: 'Alice' }));

// Write with expiration
await env.MY_KV.put('session:abc', data, {
  expirationTtl: 3600  // Expire in 1 hour
});

// Read
const value = await env.MY_KV.get('key');
const user = JSON.stringify(await env.MY_KV.get('user:123', 'json'));

// Delete
await env.MY_KV.delete('key');

// List keys
const { keys } = await env.MY_KV.list({ prefix: 'user:' });
```

### Best Practices

**DO**:
- Use KV for read-heavy workloads (cached globally)
- Cache API responses, configuration, session data
- Use prefixes for organization (`user:`, `cache:`, `config:`)
- Set expiration for temporary data

**DON'T**:
- Use KV for strong consistency (use D1 or Durable Objects)
- Exceed 1,000 writes/day on free tier (batch or use D1)
- Store large values (>25MB limit)

## D1 (SQL Database)

### Configuration (wrangler.toml)

```toml
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-db-id"
```

### Basic Queries

```javascript
// Execute query
const { results } = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).all();

// Insert
const info = await env.DB.prepare(
  'INSERT INTO users (name, email) VALUES (?, ?)'
).bind(name, email).run();

// Transaction
await env.DB.batch([
  env.DB.prepare('INSERT INTO orders (user_id) VALUES (?)').bind(userId),
  env.DB.prepare('UPDATE inventory SET count = count - 1 WHERE id = ?').bind(itemId)
]);
```

### Schema Migrations

```sql
-- Create table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add index
CREATE INDEX idx_email ON users(email);
```

**Migration workflow**:
```bash
# Create migration
wrangler d1 migrations create my-database create_users_table

# Apply migration
wrangler d1 migrations apply my-database

# Rollback
wrangler d1 migrations revert my-database
```

## R2 (Object Storage)

### Configuration (wrangler.toml)

```toml
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### File Operations

```javascript
// Upload file
await env.MY_BUCKET.put('files/document.pdf', fileData, {
  httpMetadata: {
    contentType: 'application/pdf',
    cacheControl: 'public, max-age=31536000'
  },
  customMetadata: {
    uploadedBy: userId,
    encrypted: 'true'
  }
});

// Download file
const object = await env.MY_BUCKET.get('files/document.pdf');
if (object === null) {
  return new Response('Not found', { status: 404 });
}
const fileData = await object.arrayBuffer();

// Stream file (efficient for large files)
const object = await env.MY_BUCKET.get('files/large-video.mp4');
return new Response(object.body, {
  headers: {
    'Content-Type': object.httpMetadata.contentType
  }
});

// List objects
const { objects } = await env.MY_BUCKET.list({ prefix: 'files/' });

// Delete
await env.MY_BUCKET.delete('files/document.pdf');
```

### Multipart Upload (Large Files)

```javascript
// Start multipart upload
const upload = await env.MY_BUCKET.createMultipartUpload('large-file.zip');

// Upload parts
const part1 = await upload.uploadPart(1, chunk1);
const part2 = await upload.uploadPart(2, chunk2);

// Complete
await upload.complete([part1, part2]);
```

## Durable Objects

### Define Durable Object

```javascript
export class Counter {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    // Get persistent value
    let count = (await this.state.storage.get('count')) || 0;

    // Increment
    count++;

    // Store (automatically persisted)
    await this.state.storage.put('count', count);

    return new Response(count.toString());
  }
}
```

### Configure (wrangler.toml)

```toml
[[durable_objects.bindings]]
name = "COUNTER"
class_name = "Counter"
script_name = "my-worker"

[[migrations]]
tag = "v1"
new_classes = ["Counter"]
```

### Use Durable Objects

```javascript
export default {
  async fetch(request, env) {
    // Get Durable Object instance by ID
    const id = env.COUNTER.idFromName('global-counter');
    const obj = env.COUNTER.get(id);

    // Forward request to Durable Object
    return obj.fetch(request);
  }
};
```

### WebSocket with Durable Objects

```javascript
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.sessions = [];
  }

  async fetch(request) {
    // Upgrade to WebSocket
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleSession(webSocket) {
    webSocket.accept();
    this.sessions.push(webSocket);

    webSocket.addEventListener('message', event => {
      // Broadcast to all sessions
      this.sessions.forEach(session => {
        session.send(event.data);
      });
    });

    webSocket.addEventListener('close', () => {
      this.sessions = this.sessions.filter(s => s !== webSocket);
    });
  }
}
```

## Queues

### Configuration (wrangler.toml)

```toml
[[queues.producers]]
queue = "my-queue"
binding = "MY_QUEUE"

[[queues.consumers]]
queue = "my-queue"
max_batch_size = 10
max_batch_timeout = 30
```

### Send Messages

```javascript
// Send single message
await env.MY_QUEUE.send({
  type: 'process-image',
  imageId: '12345',
  userId: 'user-abc'
});

// Send batch
await env.MY_QUEUE.sendBatch([
  { body: { type: 'email', to: 'user1@example.com' } },
  { body: { type: 'email', to: 'user2@example.com' } }
]);
```

### Consume Messages

```javascript
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { type, imageId } = message.body;

      if (type === 'process-image') {
        await processImage(imageId, env);
        message.ack();  // Mark as processed
      } else {
        message.retry();  // Retry later
      }
    }
  }
};
```

## wrangler.toml Configuration

### Complete Example

```toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Environment variables
[vars]
ENVIRONMENT = "production"
API_URL = "https://api.example.com"

# KV Namespaces
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "production-db"
database_id = "your-db-id"

# R2 Buckets
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"

# Durable Objects
[[durable_objects.bindings]]
name = "CHAT_ROOM"
class_name = "ChatRoom"

# Queues
[[queues.producers]]
queue = "background-tasks"
binding = "QUEUE"

# Secrets (set with: wrangler secret put SECRET_NAME)
# API_KEY - set via wrangler secret put API_KEY

# Environment-specific configs
[env.staging]
vars = { ENVIRONMENT = "staging" }
```

## Development Workflow

### Local Development

```bash
# Start local dev server
wrangler dev

# With local bindings
wrangler dev --local

# With remote bindings (uses real KV, D1, etc.)
wrangler dev --remote
```

### Deployment

```bash
# Deploy to production
wrangler deploy

# Deploy to staging environment
wrangler deploy --env staging

# Deploy with specific version
wrangler versions deploy
```

### Live Logs

```bash
# Tail production logs
wrangler tail

# Pretty-formatted logs
wrangler tail --format=pretty

# Filter by specific text
wrangler tail --search="ERROR"
```

## Common Patterns

### Pattern 1: API with Rate Limiting

```javascript
export default {
  async fetch(request, env) {
    const ip = request.headers.get('CF-Connecting-IP');

    // Check rate limit in KV
    const key = `ratelimit:${ip}`;
    const count = parseInt(await env.KV.get(key) || '0');

    if (count > 100) {
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // Increment counter
    await env.KV.put(key, (count + 1).toString(), { expirationTtl: 60 });

    // Process request
    return handleRequest(request, env);
  }
};
```

### Pattern 2: Caching API Responses

```javascript
async function fetchWithCache(url, env) {
  const cacheKey = `cache:${url}`;

  // Try cache first
  const cached = await env.KV.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch and cache
  const response = await fetch(url);
  const data = await response.json();

  await env.KV.put(cacheKey, JSON.stringify(data), {
    expirationTtl: 3600  // 1 hour
  });

  return data;
}
```

### Pattern 3: File Upload to R2

```javascript
async function handleUpload(request, env) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return new Response('No file uploaded', { status: 400 });
  }

  const fileId = crypto.randomUUID();
  const key = `uploads/${fileId}/${file.name}`;

  // Upload to R2
  await env.STORAGE.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });

  // Store metadata in D1
  await env.DB.prepare(
    'INSERT INTO files (id, name, size, key) VALUES (?, ?, ?, ?)'
  ).bind(fileId, file.name, file.size, key).run();

  return new Response(JSON.stringify({ fileId, key }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Pattern 4: Background Processing with Queues

```javascript
// Producer: Add task to queue
export default {
  async fetch(request, env) {
    const { imageId } = await request.json();

    await env.QUEUE.send({
      type: 'resize-image',
      imageId,
      sizes: [100, 200, 400]
    });

    return new Response('Processing started');
  }
};

// Consumer: Process tasks
export default {
  async queue(batch, env) {
    for (const message of batch.messages) {
      const { imageId, sizes } = message.body;

      // Get original image from R2
      const original = await env.STORAGE.get(`images/${imageId}`);

      // Resize and store
      for (const size of sizes) {
        const resized = await resizeImage(original, size);
        await env.STORAGE.put(`images/${imageId}-${size}`, resized);
      }

      message.ack();
    }
  }
};
```

## Performance Optimization

### Minimize Cold Starts

```javascript
// Keep heavy imports at top level
import { someLibrary } from 'some-library';

// Reuse connections
let dbConnection;

export default {
  async fetch(request, env) {
    // Reuse connection if exists
    if (!dbConnection) {
      dbConnection = await createConnection(env);
    }

    return handleRequest(request, dbConnection);
  }
};
```

### Stream Large Responses

```javascript
// Stream from R2 (don't load entire file into memory)
const object = await env.STORAGE.get('large-file.mp4');
return new Response(object.body);

// Transform stream
const { readable, writable } = new TransformStream();
object.body.pipeTo(writable);
return new Response(readable);
```

### Batch Operations

```javascript
// Bad: Multiple KV operations
for (const key of keys) {
  await env.KV.put(key, value);  // 1000 writes = $5
}

// Good: Batch in D1 or store as JSON
await env.KV.put('batch:data', JSON.stringify(data));  // 1 write = $0.005
```

## Security Best Practices

### Secrets Management

```bash
# Never commit secrets to code
# Use wrangler secrets
wrangler secret put API_KEY
wrangler secret put DATABASE_URL
```

```javascript
// Access secrets from env
const apiKey = env.API_KEY;
```

### Input Validation

```javascript
async function handleRequest(request, env) {
  const { userId, amount } = await request.json();

  // Validate input
  if (!userId || typeof userId !== 'string') {
    return new Response('Invalid userId', { status: 400 });
  }

  if (!amount || amount < 0 || amount > 10000) {
    return new Response('Invalid amount', { status: 400 });
  }

  // Process...
}
```

### CORS Headers

```javascript
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}

// Handle OPTIONS preflight
if (request.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders(origin) });
}
```

## Error Handling

```javascript
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Error:', error);

      // Log to external service
      ctx.waitUntil(
        logError(error, env)
      );

      return new Response('Internal server error', { status: 500 });
    }
  }
};

async function logError(error, env) {
  await env.ERRORS.put(
    `error:${Date.now()}`,
    JSON.stringify({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  );
}
```

## Testing

### Unit Tests (Vitest)

```javascript
import { env, createExecutionContext } from 'cloudflare:test';
import worker from './index';

describe('Worker', () => {
  it('handles GET request', async () => {
    const request = new Request('https://example.com/api/users');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);

    expect(response.status).toBe(200);
  });
});
```

### Integration Tests (wrangler dev)

```bash
# Start dev server
wrangler dev --port 8787

# Test with curl
curl http://localhost:8787/api/users
```

## Troubleshooting

**CPU Time Exceeded**: Optimize hot paths, use streaming, upgrade to paid plan (30s limit)

**Memory Limit**: Stream large files, don't load entire response into memory

**Subrequest Limit**: Maximum 50 subrequests per invocation, batch where possible

**KV Consistency**: Remember KV is eventually consistent (takes seconds to propagate)

For observability and monitoring, see the `cloudflare-observability` skill. For cost optimization, see `cloudflare-cost-optimization` skill.
