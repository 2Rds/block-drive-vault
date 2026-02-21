# Block-Drive-Vault — Claude Code Instructions

## Project Context
Web3 encrypted file storage platform (v2.3.0).
Dynamic authentication + Fireblocks TSS-MPC embedded Solana + EVM wallets. Dual-chain: Solana (files, SNS, cNFTs) + Base (USDC subscriptions, Aave yield, ENS). Supabase backend + Cloudflare Worker API Gateway.

## mem0 Memory
When saving memories for this project, always tag with:
```json
{
  "project": "block-drive-vault",
  "domain": "blockchain/web3"
}
```

## Commands
```bash
# Frontend
npm install && npm run dev       # Vite dev server
npm run build                    # Production build (may need NODE_OPTIONS="--max-old-space-size=8192")

# API Gateway Worker
cd workers/api-gateway && npm install
npx wrangler dev                 # Local worker dev
npx wrangler deploy              # Deploy to Cloudflare
npx tsc --noEmit                 # Type check

# Subscription Processor Worker
cd workers/subscription-processor && npm install
npx wrangler dev                 # Local dev (cron trigger)
npx wrangler deploy              # Deploy to Cloudflare

# Recovery SDK (Python)
cd recovery-sdk && pip install -e ".[solana]"   # Dev install
pytest tests/                                    # Run 39 tests
```

## Key Paths
- Frontend: `src/` (React 18 + TypeScript + Vite)
- Auth Layer:
  - `src/providers/DynamicProvider.tsx` — DynamicContextProvider + WagmiProvider wrapper (Fireblocks TSS-MPC, Solana + EVM)
  - `src/contexts/DynamicAuthContext.tsx` — Auth state: userId, user, isSignedIn, supabase, walletAddress, ensName, hasBlockDriveNFT
  - `src/hooks/useDynamicWallet.tsx` — Wallet hook: address, signMessage(), getBalance(), getEvmWalletClient()
- EVM/Base Layer:
  - `src/config/wagmi.ts` — wagmi config (Base chain, USDC/Aave contract addresses)
  - `src/hooks/useCryptoSubscription.ts` — ERC-20 approve + pull USDC subscription flow
  - `src/hooks/useCryptoBalance.ts` — Multi-chain USDC balance (Base + Solana)
  - `src/hooks/useAaveYield.ts` — Aave V3 USDC supply/withdraw on Base
  - `src/hooks/useKaminoYield.ts` — Kamino KLEND USDC supply/withdraw on Solana
  - `src/hooks/useEnsIdentity.ts` — ENS subdomain registration via Namestone
- API Gateway Worker: `workers/api-gateway/src/` (Cloudflare Worker)
  - `solana.ts` — SNS subdomains + Bubblegum V2 cNFT minting + MPL-Core collections
  - `webhooks.ts` — Dynamic webhook handler (HMAC-SHA256 signature verification)
  - `index.ts` — Main router (R2, IPFS, Filebase, Solana, metadata, webhooks)
- Subscription Processor: `workers/subscription-processor/` (Cloudflare Worker cron — daily USDC charge processing)
- Edge Functions: `supabase/functions/` (Deno runtime)
- Components: `src/components/`
- Pages: `src/pages/`
- Hooks: `src/hooks/`
- UI: shadcn/ui in `src/components/ui/`
- Docs: `docs/` (ARCHITECTURE.md, SECURITY.md, SOLANA_PROGRAM_ARCHITECTURE.md, IMPLEMENTATION_PLAN.md)
- Recovery SDK: `recovery-sdk/blockdrive/` (Python — wallet, crypto, storage, solana, recovery)

## Environment
Required env vars (`.env.local`):
```
VITE_DYNAMIC_ENVIRONMENT_ID=...   # Dynamic dashboard → environment ID
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_STRIPE_PUBLISHABLE_KEY=...   # Optional (payments)
```

## Conventions
- Design system: "Vault Noir" dark theme
- Auth: Dynamic identity + Fireblocks TSS-MPC embedded Solana + EVM wallets (gas-sponsored)
- Backend: Supabase Edge Functions (Deno) + Cloudflare Worker API Gateway
- Storage: Filebase IPFS (S3 API) + Cloudflare R2 with client-side AES-256-GCM encryption
- Blockchain: Solana (SNS subdomains + Bubblegum V2 soulbound cNFTs + MPL-Core collections)
- EVM: Base chain via viem + wagmi (USDC subscriptions, Aave V3 yield, ENS identity)
- Treasury wallet: `FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3`
- Webhooks: Dynamic → HMAC-SHA256-signed → API Gateway (`/webhooks/dynamic`)
- Payments: Stripe (fiat) + ERC-20 approve/pull USDC on Base (crypto)

## Key Patterns
- All Solana operations are treasury-signed (users never sign on-chain txns)
- cNFT metadata stored in R2, served via `/metadata/cnft/{domain}` endpoint
- Org member cNFTs go into per-org MPL-Core collections; individual cNFTs use global collection
- Edge Functions use `supabase/functions/_shared/cors.ts` for CORS
- Webhook handlers return 207 Multi-Status on partial failure
- Auth hook: `useDynamicAuth()` provides userId, user, isSignedIn, supabase, signOut, walletAddress, ensName, hasBlockDriveNFT
- Wallet hook: `useDynamicWallet()` provides address, signMessage(Uint8Array), getBalance(), getEvmWalletClient()
- Auth buttons: Use `setShowAuthFlow(true)` from `useDynamicContext()` to open Dynamic auth modal directly (no page navigation)
- EVM wallet: Use `evmWallet` (not `primaryWallet`) for `getWalletClient()` — Dynamic may set Solana as primary
- Org management uses a compatibility shim (`useOrganizationCompat`) — full Supabase-backed orgs planned (WS6)
- Supabase JWT: Dynamic JWT `sub` claim = user ID, used by all RLS policies
- Dual identity: `username.blockdrive.sol` (SNS) + `username.blockdrive.eth` (ENS via Namestone)
- Subscription gate: `ProtectedRoute` redirects `pending` tier users to `/pricing` (exempts `/onboarding`, `/account`, `/subscription-*`)
- Default signup tier is `pending` (no free tier) — users must subscribe via Stripe Checkout (7-day Pro trial available)
- Onboarding: 5 steps (Org → Username → Wallet → Identity → Plan) — plan selection is mandatory
- Subscription processor: Cloudflare Worker cron (daily 06:00 UTC), wraps each charge in try/catch for isolation
