# Block-Drive-Vault — Claude Code Instructions

## Project Context
Web3 encrypted file storage platform (v1.2.0).
Clerk auth + Crossmint embedded Solana wallets. Supabase backend + Cloudflare Worker API Gateway.

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
npm run build                    # Production build

# API Gateway Worker
cd workers/api-gateway && npm install
npx wrangler dev                 # Local worker dev
npx wrangler deploy              # Deploy to Cloudflare
npx tsc --noEmit                 # Type check

# Recovery SDK (Python)
cd recovery-sdk && pip install -e ".[solana]"   # Dev install
pytest tests/                                    # Run 39 tests
```

## Key Paths
- Frontend: `src/` (React 18 + TypeScript + Vite)
- API Gateway Worker: `workers/api-gateway/src/` (Cloudflare Worker)
  - `solana.ts` — SNS subdomains + Bubblegum V2 cNFT minting + MPL-Core collections
  - `webhooks.ts` — Clerk webhook handler (Svix signature verification)
  - `index.ts` — Main router (R2, IPFS, Filebase, Solana, metadata, webhooks)
- Edge Functions: `supabase/functions/` (Deno runtime)
- Components: `src/components/`
- Pages: `src/pages/`
- Hooks: `src/hooks/`
- UI: shadcn/ui in `src/components/ui/`
- Docs: `docs/` (ARCHITECTURE.md, SECURITY.md, SOLANA_PROGRAM_ARCHITECTURE.md, IMPLEMENTATION_PLAN.md)
- Recovery SDK: `recovery-sdk/blockdrive/` (Python — wallet, crypto, storage, solana, recovery)

## Conventions
- Design system: "Vault Noir" dark theme
- Auth: Clerk identity + Crossmint embedded Solana wallets (MPC, gas-sponsored)
- Backend: Supabase Edge Functions (Deno) + Cloudflare Worker API Gateway
- Storage: Filebase IPFS (S3 API) + Cloudflare R2 with client-side AES-256-GCM encryption
- Blockchain: Solana (SNS subdomains + Bubblegum V2 soulbound cNFTs + MPL-Core collections)
- Treasury wallet: `FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3`
- Webhooks: Clerk → Svix-signed → API Gateway (`/webhooks/clerk`)

## Key Patterns
- All Solana operations are treasury-signed (users never sign on-chain txns)
- cNFT metadata stored in R2, served via `/metadata/cnft/{domain}` endpoint
- Org member cNFTs go into per-org MPL-Core collections; individual cNFTs use global collection
- Edge Functions use `supabase/functions/_shared/cors.ts` for CORS
- Webhook handlers return 207 Multi-Status on partial failure
