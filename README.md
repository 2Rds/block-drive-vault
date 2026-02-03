# BlockDrive

**Decentralized Web3 Storage Platform with Zero-Knowledge Cryptography**

BlockDrive is a next-generation cloud storage platform that combines encrypted storage, blockchain authentication, zero-knowledge proofs, and enterprise collaboration features. Built on Solana with multi-chain wallet support.

## Key Features

### Security & Privacy
- **Programmed Incompleteness**: Proprietary architecture enabling instant, irreversible access revocation
- **AES-256-GCM Encryption**: Military-grade encryption with wallet-derived keys
- **Zero-Knowledge Proofs**: Groth16 proofs verify file integrity without revealing content
- **Metadata Privacy v2**: Encrypted metadata with HMAC search tokens
- **Client-Side Only**: All encryption/decryption happens locally

### Blockchain Integration
- **Solana Anchor Program**: On-chain file records, commitments, and access delegation
- **Multi-PDA Sharding**: Supports 1000+ files per user (10 shards × 100 files)
- **SNS Subdomains**: Human-readable addresses (`username.blockdrive.sol`)
- **Soulbound NFT Membership**: Token-2022 non-transferable membership tokens

### Organizations & Collaboration
- **Clerk Organizations**: Native team management with role-based access
- **Invite Codes**: Generate and share organization invite codes
- **Email Domain Verification**: Magic link verification for business emails
- **Hierarchical Subdomains**: `username.organization.blockdrive.sol`

### Multi-Chain Wallets
- **Crossmint Embedded Wallets**: Non-custodial MPC wallets with gas sponsorship
- **Multichain Support**: Solana, Ethereum, Base, Polygon, Arbitrum, Optimism
- **Gasless Operations**: Crossmint sponsors all transaction fees

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
| Auth | Clerk + Crossmint |
| Backend | Supabase Edge Functions (Deno) |
| Database | PostgreSQL + RLS |
| Blockchain | Solana Anchor |
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
│  │  Crossmint  │    │  Filebase IPFS   │    │  Solana Program   │ │
│  │  Wallets    │    │  + R2 + Arweave  │    │  (Multi-PDA)      │ │
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
- HKDF-SHA256 from wallet signatures
- 4-hour session expiry with auto-refresh

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
from blockdrive import recover_file

# Recover without BlockDrive app
plaintext = recover_file(
    file_id="...",
    encryption_key="...",
    ipfs_gateway="https://ipfs.filebase.io"
)
```

## Development Status

**Phase 8: Testing & Deployment** (95% complete)

- ✅ Multi-PDA Sharding (1000+ files/user)
- ✅ Metadata Privacy v2
- ✅ Organization System
- ✅ Stripe Sync Engine
- ✅ Crossmint Crypto Payments
- ✅ Python Recovery SDK
- 🔄 E2E Testing
- 📋 Mainnet Deployment

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Proprietary - All Rights Reserved

## Links

- **Website**: https://blockdrive.io
- **Documentation**: https://docs.blockdrive.io
- **Support**: support@blockdrive.io
