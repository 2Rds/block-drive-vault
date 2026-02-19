# BlockDrive v1.2.0

**Decentralized Web3 Storage Platform with Zero-Knowledge Cryptography**

BlockDrive is a next-generation cloud storage platform that combines encrypted storage, blockchain authentication, zero-knowledge proofs, and enterprise collaboration features. Built on Solana with Clerk + Crossmint authentication.

## Key Features

### Security & Privacy
- **Programmed Incompleteness**: Proprietary architecture — breached data is incomplete and useless
- **AES-256-GCM Encryption**: 3 security levels derived from security question via HKDF-SHA256
- **Zero-Knowledge Proofs**: Groth16 proofs verify file integrity without revealing content
- **Session-Persistent Keys**: Answer once per session; keys auto-restore on page refresh (4-hour expiry)
- **Client-Side Only**: All encryption/decryption happens locally, keys never leave the browser

### Blockchain Integration
- **Solana Anchor Program**: On-chain file records, commitments, and access delegation
- **Multi-PDA Sharding**: Supports 1000+ files per user (10 shards × 100 files)
- **SNS Subdomains**: Human-readable addresses (`username.blockdrive.sol`)
- **Soulbound NFT Membership**: Bubblegum V2 compressed soulbound NFTs
- **Per-Org NFT Collections**: MPL-Core collections for branded org membership

### Organizations & Collaboration
- **Clerk Organizations**: Native team management with role-based access
- **Invite Codes**: Generate and share organization invite codes
- **Email Domain Verification**: Magic link verification for business emails
- **Hierarchical Subdomains**: `username.organization.blockdrive.sol`

### Authentication & Wallets
- **Clerk Identity**: Email, social login, organization management
- **Crossmint Embedded Wallets**: Non-custodial MPC Solana wallets with gas sponsorship
- **External Wallets**: MetaMask, Coinbase Wallet for Clerk auth (not embedded)
- **Gasless Operations**: Crossmint sponsors all Solana transaction fees

### File Management
- **Folder Organization**: Create, delete, and navigate folders with persistent storage
- **Drag-and-Drop**: Drop OS files to upload, or drag file cards onto folder cards to move
- **Move to Folder**: Context menu option with folder picker modal
- **Directory Filtering**: Files shown only at their current folder level
- **Separated Sections**: Folders and files displayed in distinct, labeled grid sections

### Payments
- **Stripe Integration**: Fiat payments with Stripe Sync Engine
- **Crypto Payments**: USDC, SOL, ETH via Crossmint
- **Recurring Billing**: Automatic crypto subscriptions via pg_cron

### Storage Providers
- **Filebase (Primary)**: Enterprise IPFS with 3x redundancy
- **Cloudflare R2**: ZK proof storage and caching
- **Arweave (Optional)**: Permanent storage for critical files

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Clerk + Crossmint Embedded Wallets |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL + RLS |
| Blockchain | Solana (SNS + Bubblegum V2 + MPL-Core) |
| Storage | Filebase + R2 + Arweave |
| Cryptography | AES-256-GCM + Groth16 |
| Payments | Stripe + Crossmint |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BLOCKDRIVE ARCHITECTURE                       │
│                                                                     │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐ │
│  │   React     │────│  Cloudflare Edge │────│  Supabase Edge    │ │
│  │   Frontend  │    │  (WAF/Workers)   │    │  Functions (41)   │ │
│  └─────────────┘    └──────────────────┘    └───────────────────┘ │
│         │                                            │             │
│         ▼                                            ▼             │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────────┐ │
│  │  Clerk +    │    │  Filebase IPFS   │    │  Solana Program   │ │
│  │  Crossmint  │    │  + R2 + Arweave  │    │  (Multi-PDA)      │ │
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
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_...

# Crossmint (Embedded Wallets)
VITE_CROSSMINT_CLIENT_API_KEY=...
VITE_CROSSMINT_ENVIRONMENT=staging

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
│   ├── components/         # 151 React components
│   │   ├── auth/           # Authentication
│   │   ├── files/          # File management
│   │   ├── organization/   # Organization UI
│   │   └── ui/             # shadcn/ui library
│   ├── services/           # 49 service files
│   │   ├── crypto/         # Encryption & ZK
│   │   ├── solana/         # Blockchain client
│   │   ├── storage/        # Multi-provider
│   │   └── crossmint/      # Wallet integration
│   ├── hooks/              # React hooks
│   ├── pages/              # Route components
│   └── contexts/           # React contexts
├── supabase/
│   ├── functions/          # 41 edge functions
│   └── migrations/         # Database migrations
├── programs/               # Solana Anchor program
└── docs/                   # Documentation
```

## Documentation

- [Architecture](docs/architecture.md) - Technical architecture
- [Security Model](docs/security.md) - Security design
- [PRD](docs/prd.md) - Product requirements
- [Solana Program](docs/solana_program_architecture.md) - On-chain design

## Security Features

### Programmed Incompleteness
Files are deliberately stored incomplete:
1. Encrypted file content → IPFS (Filebase)
2. Critical 16 bytes → Separate storage (R2)
3. ZK proof of knowledge → On-chain commitment

Revoking access destroys the critical bytes, making decryption **mathematically impossible**.

### Zero-Knowledge Proofs
- **Circuit**: Groth16 on bn128 curve
- **Hash**: Poseidon (circuit-native)
- **Verification**: On-chain commitment comparison

### Key Derivation
- 3-level security (Standard, Sensitive, Maximum)
- Security question answer → SHA-256 hash → `derive-key-material` edge function → HKDF-SHA256
- 4-hour session expiry with auto-restore from sessionStorage
- Module-level singleton via `useSyncExternalStore` (shared across all components)

## Organization System

BlockDrive supports hierarchical organizations with Clerk:

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

**v1.2.0** — February 19, 2026

- ✅ Python Recovery SDK (`recovery-sdk/`) — HKDF + AES-256-GCM + ZK proof verification
- ✅ Frontend migration to Solana native minting via Worker API gateway
- ✅ Session sign-in requirement on each new browser visit
- ✅ 12 bug fixes (R2 fallback, Bubblegum V2 tree, Clerk JWT, rate limiting)

**v1.1.0** — February 16, 2026

- ✅ Per-org MPL-Core NFT collections (~0.003 SOL each)
- ✅ Organization deletion handler (on-chain + DB cleanup)
- ✅ Svix-signed Clerk webhook handlers (user.deleted, organization.deleted)
- ✅ Intercom messenger with JWT identity verification
- ✅ Release automation (`/release` slash command + pre-push hook)

**v1.0.0** — February 9, 2026

- ✅ Multi-PDA Sharding (1000+ files/user)
- ✅ Metadata Privacy v2
- ✅ Organization System (Clerk Organizations)
- ✅ Stripe + Crypto Payment Processing
- ✅ End-to-End Encrypted Upload, Download, Preview
- ✅ Security Question Key Derivation with Session Persistence
- ✅ Folder Management with Drag-and-Drop
- ✅ Solana On-Chain File Registry with ZK Proofs
- ✅ On-Chain File Sharing via Delegation PDAs
- ✅ Cloudflare Worker API Gateway

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Proprietary - All Rights Reserved

## Links

- **Website**: https://blockdrive.co
- **Documentation**: https://docs.blockdrive.co
- **Support**: support@blockdrive.co
