---
name: setup-waf
description: Configure WAF rules interactively with guided setup
allowed-tools: [Read, Write, AskUserQuestion, Bash]
argument-hint: ""
---

Interactive WAF (Web Application Firewall) configuration.

## Process

1. **Ask about protection needs** using AskUserQuestion:
   - Question: "What do you want to protect against?"
   - Options:
     - "SQL injection and XSS (Recommended)"
     - "Rate limiting on specific endpoints"
     - "Block specific countries or IPs"
     - "All of the above"

2. **Configure based on selection**:
   - **SQL/XSS**: Enable OWASP Managed Ruleset
   - **Rate limiting**: Ask for endpoints and limits
   - **Geo-blocking**: Ask for countries to block
   - **All**: Configure all protections

3. **Create rules configuration**:
   - Write to `cloudflare/waf-rules.json`
   - Include clear comments explaining each rule

4. **Apply rules**:
   - Ask: "Apply rules to Cloudflare now?"
   - If yes: Use cf-docs MCP server or provide curl commands
   - If no: Save config for later

5. **Test guidance**:
   - "Test your WAF rules in Security → Events dashboard"
   - "Watch for false positives (legitimate traffic blocked)"
   - "Use /cloudflare:tail to see blocked requests in logs"

## Safety

- Always show rules before applying
- Explain each rule in simple terms
- Warn about potential false positives
- Provide rollback instructions
