# BlockDrive v2.2.0

**Decentralized Web3 Storage Platform with Zero-Knowledge Cryptography**

BlockDrive is a next-generation cloud storage platform that combines encrypted storage, blockchain authentication, zero-knowledge proofs, and enterprise collaboration features. Built on Solana with Dynamic SDK (Fireblocks TSS-MPC wallets).

## Key Features

### Security & Privacy
- **Programmed Incompleteness**: Proprietary architecture — breached data is incomplete and useless
- **AES-256-GCM Encryption**: 3 security levels with HKDF-SHA256 key derivation
- **Zero-Knowledge Proofs**: Groth16 proofs verify file integrity without revealing content
- **Client-Side Only**: All encryption/decryption happens locally, keys never leave the browser

### Blockchain Integration
- **Solana Anchor Program**: On-chain file records, commitments, and access delegation
- **Multi-PDA Sharding**: Supports 1000+ files per user (10 shards x 100 files)
- **SNS Subdomains**: Human-readable addresses (`username.blockdrive.sol`)
- **Soulbound NFT Membership**: Bubblegum V2 compressed soulbound NFTs
- **Per-Org NFT Collections**: MPL-Core collections for branded org membership

### Authentication & Wallets
- **Dynamic SDK**: Email, social login (Google/Apple/GitHub), passkey/biometric auth
- **Fireblocks TSS-MPC Wallets**: Non-custodial embedded Solana + EVM wallets with `signMessage` support
- **Gasless Operations**: Treasury wallet sponsors all Solana transaction fees

### Organizations & Collaboration
- **Supabase-backed Orgs**: Team management with role-based access
- **Invite Codes**: Generate and share organization invite codes
- **Email Domain Verification**: Magic link verification for business emails
- **Hierarchical Subdomains**: `username.organization.blockdrive.sol`

### File Management
- **Folder Organization**: Create, delete, and navigate folders with persistent storage
- **Drag-and-Drop**: Drop OS files to upload, or drag file cards onto folder cards to move
- **Move to Folder**: Context menu option with folder picker modal

### Payments
- **Stripe Integration**: Fiat payments with Stripe Sync Engine
- **Auto-Debit USDC Subscriptions**: ERC-20 approve + pull on Base — user approves once, processor pulls monthly
- **Dual-Chain USDC Yield**: Earn ~3-6% APY by supplying idle USDC to Aave V3 (Base) or Kamino (Solana)
- **Exchange Funding**: Coinbase/Banxa on-ramps via Dynamic SDK funding widget

### Global Identity
- **SNS Domains**: `username.blockdrive.sol` on Solana
- **ENS Domains**: `username.blockdrive.eth` on Ethereum via Namestone

### Storage Providers
- **Filebase (Primary)**: Enterprise IPFS with 3x redundancy
- **Cloudflare R2**: ZK proof storage and caching
- **Arweave (Optional)**: Permanent storage for critical files

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Dynamic SDK (Fireblocks TSS-MPC wallets) |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL + RLS |
| Blockchain | Solana (SNS + Bubblegum V2 + MPL-Core) |
| API Gateway | Cloudflare Worker |
| Storage | Filebase + R2 + Arweave |
| Cryptography | AES-256-GCM + Groth16 |
| Payments | Stripe + USDC (Base) |
| EVM | viem + wagmi (Base chain) |
| DeFi Yield | Aave V3 (Base) + Kamino (Solana) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BLOCKDRIVE ARCHITECTURE                       │
│                                                                     │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐ │
│  │   React     │────│  Cloudflare Edge │────│  Supabase Edge    │ │
│  │   Frontend  │    │  (WAF/Workers)   │    │  Functions        │ │
│  └─────────────┘    └──────────────────┘    └───────────────────┘ │
│         │                                            │             │
│         ▼                                            ▼             │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐ │
│  │  Dynamic    │    │  Filebase IPFS   │    │  Solana Program   │ │
│  │  (Auth +    │    │  + R2 + Arweave  │    │  (Multi-PDA)      │ │
│  │   Wallets)  │    │                  │    │                   │ │
│  └─────────────┘    └──────────────────┘    └───────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/block-drive-vault.git
cd block-drive-vault

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

Create a `.env.local` file:

```env
# Dynamic Authentication
VITE_DYNAMIC_ENVIRONMENT_ID=...

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=...

# Stripe (Payments)
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

## Project Structure

```
block-drive-vault/
├── src/
│   ├── components/         # React components
│   │   ├── auth/           # Authentication (Dynamic SDK)
│   │   ├── files/          # File management
│   │   ├── organization/   # Organization UI
│   │   └── ui/             # shadcn/ui library
│   ├── services/           # Service files
│   │   ├── crypto/         # Encryption & ZK
│   │   ├── solana/         # Blockchain client
│   │   └── storage/        # Multi-provider
│   ├── hooks/              # React hooks
│   ├── pages/              # Route components
│   ├── contexts/           # React contexts
│   └── providers/          # DynamicProvider
├── workers/
│   ├── api-gateway/        # Cloudflare Worker API gateway
│   └── subscription-processor/ # USDC subscription cron worker
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── recovery-sdk/           # Python Recovery SDK
├── programs/               # Solana Anchor program
└── docs/                   # Documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - Technical architecture
- [Security Model](docs/SECURITY.md) - Security design
- [Solana Program](docs/SOLANA_PROGRAM_ARCHITECTURE.md) - On-chain design
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md) - Roadmap and status

## Security Features

### Programmed Incompleteness
Files are deliberately stored incomplete:
1. Encrypted file content → IPFS (Filebase)
2. Critical 16 bytes → Separate storage (R2), encrypted inside ZK proof
3. ZK proof of knowledge → On-chain commitment

Revoking access destroys the critical bytes, making decryption **mathematically impossible**.

### Zero-Knowledge Proofs
- **Circuit**: Groth16 on bn128 curve
- **Hash**: Poseidon (circuit-native)
- **Verification**: On-chain commitment comparison

## Organization System

BlockDrive supports hierarchical organizations:

```
Individual Users:   alice.blockdrive.sol
Organization Users: alice.acme.blockdrive.sol
Organization Root:  acme.blockdrive.sol
```

### Join Methods
1. **Invite Code**: Admin-generated codes with usage limits
2. **Email Domain**: Magic link verification for business emails

## Recovery

BlockDrive provides an open-source Python SDK for independent file recovery:

```bash
pip install blockdrive-recovery[solana]
```

```python
from blockdrive import BlockDriveRecovery, SecurityLevel

recovery = BlockDriveRecovery(
    signatures={SecurityLevel.STANDARD: sig_bytes},
)
result = recovery.recover_file(
    content_cid="bafybeig...",
    proof_cid="proof-abc123",
    security_level=SecurityLevel.STANDARD,
)
with open("recovered.pdf", "wb") as f:
    f.write(result.data)
```

## Development Status

**v2.2.0** — February 20, 2026

- Dynamic SDK full buildout: dual-chain (Solana + EVM/Base), wagmi/viem integration
- Auto-debit USDC subscriptions on Base (ERC-20 approve + pull with cron processor worker)
- ENS global identity: `username.blockdrive.eth` via Namestone alongside SNS `.sol` domains
- Dual-chain USDC yield: Aave V3 on Base + Kamino on Solana
- NFT token gate, Google Drive wallet backup status, funding rails
- Subscription processor Cloudflare Worker with retry/cancel logic

**v2.1.0** — February 19, 2026

- Client-side wallet signature key derivation (WS1) — replaces server-side `derive-key-material`
- Wallet signs a deterministic message; HKDF-SHA256 derives 3 independent AES-256-GCM keys
- Keys never leave the browser; no sessionStorage caching of secrets
- Signature validation (64-byte Ed25519), mutex on concurrent derivation, contextual crypto errors

**v2.0.0** — February 19, 2026

- Replaced Clerk + Crossmint with Dynamic SDK (Fireblocks TSS-MPC wallets)
- Dynamic auth: email, social, passkey/biometric with embedded Solana + EVM wallets
- `signMessage()` support enables client-side key derivation (WS1)
- HMAC-SHA256 webhook verification for Dynamic lifecycle events
- Provider-agnostic DB schema (`auth_provider_id`, `wallets` table)
- Zero Clerk/Crossmint references remain in codebase

**v1.2.0** — February 19, 2026

- Python Recovery SDK with HKDF + AES-256-GCM + ZK proof verification
- Frontend migration to Solana native minting via Worker API gateway
- Session sign-in requirement on each new browser visit

**v1.1.0** — February 16, 2026

- Per-org MPL-Core NFT collections (~0.003 SOL each)
- Organization deletion handler (on-chain + DB cleanup)
- Dynamic-signed webhook handlers (user.deleted, organization.deleted)

**v1.0.0** — February 9, 2026

- Multi-PDA Sharding (1000+ files/user)
- End-to-End Encrypted Upload, Download, Preview
- Solana On-Chain File Registry with ZK Proofs
- Cloudflare Worker API Gateway

## License

Proprietary - All Rights Reserved

## Links

- **Website**: https://blockdrive.co
- **Documentation**: https://docs.blockdrive.co
- **Support**: support@blockdrive.co
