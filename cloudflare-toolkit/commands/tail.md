---
name: tail
description: Watch live Worker logs with pretty formatting
allowed-tools: [Bash, Read]
argument-hint: "[--search=text] [--status=error]"
---

Watch live logs from deployed Cloudflare Worker.

## Process

1. **Find Worker**:
   - Read wrangler.toml in current directory
   - Extract Worker name

2. **Start tailing**:
   - Run: `wrangler tail --format=pretty`
   - If user provided --search or --status, add those flags
   - Let logs stream until user interrupts (Ctrl+C)

3. **Guide user**:
   - Explain: "Watching live logs... Press Ctrl+C to stop"
   - If no logs appear: "No requests yet. Try accessing your Worker"

## Examples

```
/cloudflare:tail
/cloudflare:tail --search="ERROR"
/cloudflare:tail --status=error
```

## Tips

- Filter errors: `--status=error`
- Search text: `--search="keyword"`
- Stop anytime with Ctrl+C
