---
name: check-wallet
description: Check Solana wallet balance and status. Shows SOL balance, token holdings, and recent activity for the current or specified wallet.
argument-hint: "[wallet_address]"
allowed-tools:
  - Bash
  - Read
  - WebFetch
---

# Check Wallet Command

Check the balance and status of a Solana wallet on the current network.

## Instructions

When this command is invoked:

1. **Determine the wallet address**:
   - If an address is provided as argument, use it
   - Otherwise, attempt to get the default wallet from Solana CLI config

2. **Detect the current network**:
   - Read the Solana CLI config to determine devnet vs mainnet
   - Display the network prominently in output

3. **Fetch wallet information**:
   - Get SOL balance using `solana balance <address>`
   - Get token accounts using `spl-token accounts --owner <address>`
   - Show recent transactions if requested

4. **Format the output clearly**:
   ```
   Wallet: <address>
   Network: devnet | mainnet

   SOL Balance: X.XXX SOL

   Token Holdings:
   - Token A: XXX
   - Token B: XXX

   Recent Activity: [if available]
   ```

## Example Usage

```
/check-wallet
/check-wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

## Network Awareness

Always display which network is being queried. If on mainnet, add a note that balances shown are real funds.

## Error Handling

- If wallet address is invalid, explain the correct format
- If RPC fails, suggest checking network connectivity
- If wallet doesn't exist, indicate it may be a new/unfunded wallet
