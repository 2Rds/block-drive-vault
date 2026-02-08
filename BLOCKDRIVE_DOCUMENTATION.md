# BlockDrive Platform Documentation

## Overview

BlockDrive is a comprehensive Web3 data management platform that combines decentralized storage, blockchain authentication, zero-knowledge cryptography, and enterprise-grade features. It provides secure, scalable solutions for storing, managing, and accessing data across multiple blockchain networks with proprietary "Programmed Incompleteness" security architecture.

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Core Features](#core-features)
3. [Security & Cryptography](#security--cryptography)
4. [Multichain Authentication (MCA)](#multichain-authentication-mca)
5. [Storage & File Management](#storage--file-management)
6. [Team Collaboration](#team-collaboration)
7. [Integrations](#integrations)
8. [Business Formation](#business-formation)
9. [Subscription & Pricing](#subscription--pricing)
10. [Solana Program Integration](#solana-program-integration)
11. [API & Development](#api--development)
12. [Deployment & Infrastructure](#deployment--infrastructure)

---

## Platform Architecture

### Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling with custom design system
- Shadcn/ui component library
- React Router for navigation
- TanStack React Query for data fetching

**Backend:**
- Supabase for database and authentication
- Edge Functions for serverless compute
- Multi-provider storage (Filebase/IPFS, S3, Arweave)
- Stripe for payment processing

**Blockchain:**
- Dynamic Labs SDK for multi-chain wallet connectivity
- Solana Anchor program for on-chain file registry
- Support for Ethereum, Base, Solana, and 50+ networks
- SNS (.sol) and Basenames (.base) domain verification

**Cryptography:**
- AES-256-GCM encryption with 3 security levels
- Zero-Knowledge Proofs (snarkjs/Groth16)
- ECDH key exchange for secure file sharing
- Wallet-derived encryption keys via HKDF

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── crypto/          # Encryption setup components
│   ├── dashboard/       # Dashboard widgets
│   ├── files/           # File management & sharing
│   ├── integrations/    # Third-party integrations
│   ├── landing/         # Landing page components
│   ├── membership/      # NFT membership badges
│   ├── sidebar/         # Sidebar navigation
│   ├── storage/         # Multi-provider storage
│   ├── subscription/    # Pricing and billing
│   ├── team/           # Team management
│   ├── upload/         # BlockDrive upload components
│   ├── viewer/         # Encrypted file viewer
│   └── ui/             # Base UI components (shadcn)
├── circuits/           # Circom ZK circuits
├── hooks/              # Custom React hooks
├── pages/              # Page components
├── services/           # Business logic and API calls
│   ├── crypto/         # Encryption services
│   ├── ipfs/           # IPFS integration
│   ├── solana/         # Solana program client
│   └── storage/        # Multi-provider orchestrator
├── types/              # TypeScript type definitions
└── utils/              # Utility functions

programs/blockdrive/    # Solana Anchor program
├── src/
│   ├── instructions/   # Vault, file, delegation handlers
│   └── state/          # PDA account structures
```

---

## Core Features

### 1. Programmed Incompleteness Architecture
BlockDrive's proprietary privacy-first architecture where encrypted files are split:
- **Critical 16 bytes** are extracted and embedded in Zero-Knowledge Proofs
- **Remaining encrypted content** is uploaded to multi-provider storage
- Files cannot be decrypted without both components
- Enables "Instant Revoke" - senders can permanently revoke access

### 2. Decentralized Storage (IPFS + Multi-Provider)
- **Primary Provider**: Filebase (S3-compatible IPFS API)
- **Redundancy**: Amazon S3 and Arweave fallbacks
- **File Management**: Organize files in folders with metadata
- **Permanent Storage**: Files pinned for guaranteed availability
- **Global CDN**: Fast access through gateway network

### 3. Multi-Chain Wallet Support
- **Supported Networks**: Ethereum, Base, Solana, and 50+ other blockchains
- **Wallet Providers**: Phantom, Solflare, MetaMask, WalletConnect, and more
- **Secure Authentication**: Wallet-based login without exposing private keys
- **Cross-Chain Compatibility**: Seamless switching between different blockchain networks

### 4. On-Chain File Registry (Solana)
- **UserVault PDA**: Stores owner, master key commitment, file count
- **FileRecord PDA**: File metadata, encryption commitments, critical bytes commitment
- **Delegation PDA**: Encrypted file sharing with permission levels
- **Immutable Audit Trail**: All file operations recorded on-chain

### 5. Real-Time Analytics
- **Storage Metrics**: Track usage, file counts, and storage consumption
- **Network Status**: Monitor IPFS, S3, Arweave, and blockchain connectivity
- **Activity Logs**: Recent uploads, downloads, and team actions
- **Security Events**: ZK proof verification status and access patterns

---

## Security & Cryptography

### AES-256-GCM Encryption

Three security levels derived from wallet signatures:

| Level | Use Case | Key Derivation |
|-------|----------|----------------|
| **Standard** | General files | Basic wallet-derived key |
| **Sensitive** | Business documents | Enhanced HKDF iterations |
| **Maximum** | Critical data | Strongest key derivation |

### Zero-Knowledge Proof System

**Groth16 Circuits (snarkjs/circom):**
- Circuit: `criticalBytesCommitment.circom`
- Proves knowledge of critical 16 bytes without revealing them
- Generates on-chain commitment for verification
- Trusted setup ceremony required for production

**ZK Proof Flow:**
1. Extract critical 16 bytes from encrypted file
2. Generate Poseidon hash commitment
3. Create Groth16 proof proving knowledge
4. Store proof and commitment on Solana
5. Critical bytes stored separately on S3

### ECDH Key Exchange for File Sharing

- Elliptic Curve Diffie-Hellman for recipient encryption
- Encrypted critical bytes embedded in delegation records
- Recipients decrypt using wallet-derived keys
- End-to-end encrypted sharing

### Wallet-Derived Encryption Keys

```typescript
// 3-message wallet signature flow
const signatures = await signThreeMessages(wallet);
const masterKey = await deriveKeyFromSignatures(signatures);
// Keys never touch application servers
```

---

## Multichain Authentication (MCA)

BlockDrive implements dual-chain verification requiring ownership of both:
- **Solana**: `label.blockdrive.sol` (SNS subdomain)
- **Base/EVM**: `label.blockdrive.base` (Basenames subdomain)

### MCA Flow

1. **POST /mca/start**: Returns canonical challenge with nonce
2. User signs challenge with both wallets
3. **POST /mca/verify**: Validates signatures and domain ownership
4. Issues short-lived JWT (TTL ≤ 15 min)
5. **GET /mca/check**: Validates JWT for API calls

### SNS Verification

- Derives SNS name account PDA
- Fetches account data from Solana RPC
- Parses NameRegistry to verify owner matches wallet
- Supports QuickNode's `sns_resolveDomain` for enhanced resolution

---

## Storage & File Management

### Multi-Provider Storage Orchestrator

**Supported Providers:**
- **Filebase (Primary)**: IPFS with S3-compatible API
- **Amazon S3**: Backup and critical bytes storage
- **Arweave**: Permanent archival storage

**Features:**
- Automatic failover and health checks
- Redundancy configuration per file
- Provider rotation when health checks fail
- Chunking for large files

### File Operations

```typescript
// Upload with encryption and ZK proof
const result = await blockDriveUpload(file, {
  securityLevel: 'maximum',
  generateZkProof: true,
  registerOnChain: true
});

// Download with decryption
const decrypted = await blockDriveDownload(fileId, wallet);

// Share with instant revoke capability
const shareLink = await shareFile(fileId, recipientPubkey, {
  canRevoke: true,
  expiresAt: Date.now() + 86400000
});
```

### Storage Quotas by Plan

| Plan | Storage | Bandwidth | Team Members |
|------|---------|-----------|--------------|
| **Starter** | 100 GB | 100 GB | 1 user |
| **Pro** | 500 GB | 500 GB | 1 user |
| **Growth** | 1 TB | 1 TB | Up to 3 |
| **Scale** | 2 TB (5 seats) | 2 TB | Unlimited |

---

## Team Collaboration

### Team Management

**Features:**
- Create and manage multiple teams
- Role-based access control (Owner, Member)
- Invite members via email
- Team-specific file storage
- Shared workspaces with visibility controls

**Subscription Requirements:**
- **Growth Plan**: 1 team, up to 3 members
- **Scale Plan**: Unlimited teams and members

### File Sharing with Instant Revoke

Unique to BlockDrive: senders retain control even after sharing
- Share encrypted files with recipients
- Revoke access instantly by deleting critical bytes on-chain
- Revoked files become permanently unreadable

---

## Integrations

### Cloud Storage Platforms

| Platform | Features |
|----------|----------|
| **Slack** | File sharing to channels, notifications, commands |
| **Google Drive** | Import files, sync folder structures |
| **OneDrive** | Enterprise account support, auto-sync |
| **Dropbox** | File migration, folder preservation |
| **Box** | Enterprise file migration, bulk operations |

### Enterprise Systems

| Platform | Features |
|----------|----------|
| **Oracle NetSuite** | ERP integration, document management |
| **Salesforce** | CRM data sync, document storage |
| **Notion** | Workspace sync, collaborative content |
| **Asana** | Project files, task attachments |

### Cloud Infrastructure

| Platform | Features |
|----------|----------|
| **AWS** | S3 integration, infrastructure scaling |
| **Google Cloud** | Compute and storage capabilities |
| **Microsoft Azure** | Enterprise cloud services |
| **IBM Cloud** | AI-powered insights, secure storage |

### Financial & Business

| Platform | Features |
|----------|----------|
| **Mercury** | Automated financial document storage |
| **Xero** | Accounting data sync |
| **QuickBooks** | Bookkeeping and invoice management |
| **Gusto** | Payroll and HR documents |

### Sales & CRM

| Platform | Features |
|----------|----------|
| **Apollo** | Sales intelligence, contact data |
| **Pipedrive** | Pipeline management, document tracking |

---

## Business Formation

### OtoCo Integration
- **Onchain LLC formation** directly within BlockDrive
- Instant company spin-up without leaving platform
- Embedded widget for seamless experience
- Delaware C-Corp and LLC options

### Stripe Atlas
- Delaware C-Corp with integrated Stripe payments
- IRS EIN and 83(b) election filing
- Banking partnerships (SVB, Mercury)
- $100K+ in partner perks

### Clerky
- VC-standard legal paperwork
- Employee/contractor agreements with equity
- SAFE notes and convertible instruments
- Series A financing documents

---

## Subscription & Pricing

### Pricing Tiers

| Plan | Monthly | Quarterly | Annual | Storage |
|------|---------|-----------|--------|---------|
| **Starter** | Free | - | - | 100 GB |
| **Pro** | $49 | $134 | $499 | 500 GB |
| **Growth** | $99 | $269 | $999 | 1 TB |
| **Scale** | $199 | $549 | $1,999 | 2 TB (5 seats) |

**Scale Add-on Seats**: $39/month ($109/quarter, $399/year) per seat, +400 GB storage

### Billing Features

- **Multiple Billing Periods**: Monthly, quarterly, annual
- **Automatic Savings**: Up to 20% off annual plans
- **Usage Monitoring**: Real-time quota tracking
- **Prorated Upgrades**: Fair billing when changing plans

---

## Solana Program Integration

### Anchor Program Architecture

**Core Instructions:**
- `initialize_vault`: Create user vault PDA
- `register_file`: Register encrypted file on-chain
- `create_delegation`: Share file with recipient
- `revoke_delegation`: Revoke access instantly

**PDA Structures:**

```rust
// UserVault - per-user storage vault
pub struct UserVault {
    pub owner: Pubkey,
    pub master_key_commitment: [u8; 32],
    pub file_count: u64,
    pub created_at: i64,
}

// FileRecord - encrypted file metadata
pub struct FileRecord {
    pub owner: Pubkey,
    pub file_id: [u8; 32],
    pub encrypted_metadata_cid: String,
    pub critical_bytes_commitment: [u8; 32],
    pub security_level: u8,
    pub created_at: i64,
}

// Delegation - file sharing record
pub struct Delegation {
    pub grantor: Pubkey,
    pub grantee: Pubkey,
    pub file_record: Pubkey,
    pub encrypted_file_key: [u8; 48],
    pub permissions: u8,
    pub expires_at: Option<i64>,
}
```

---

## API & Development

### Edge Functions

| Function | Purpose |
|----------|---------|
| `mca-start` | Initiate multichain authentication |
| `mca-verify` | Verify signatures and domain ownership |
| `mca-check` | Validate JWT tokens |
| `upload-to-ipfs` | Handle file uploads to IPFS |
| `check-subscription` | Verify user subscription status |
| `create-checkout` | Process Stripe payments |
| `send-team-invitation` | Handle team invitations |
| `mint-solbound-nft` | Mint membership NFTs |

### SDK Integration

```typescript
// BlockDrive Crypto Service
import { blockDriveCryptoService } from '@/services/crypto';

// Initialize encryption keys from wallet
await blockDriveCryptoService.initializeKeys(wallet, securityLevel);

// Encrypt file with ZK proof
const { encrypted, proof, commitment } = await blockDriveCryptoService.encryptFile(file);

// Decrypt file
const decrypted = await blockDriveCryptoService.decryptFile(encrypted, proof);
```

### ZK Circuit Compilation

```bash
# Build circuits
chmod +x scripts/build-circuits.sh
./scripts/build-circuits.sh

# Run trusted setup (development)
snarkjs groth16 setup circuit.r1cs powersOfTau28_hez_final_14.ptau circuit_0000.zkey

# Production: Multi-party trusted setup ceremony
# See scripts/trusted-setup-ceremony.md
```

---

## Deployment & Infrastructure

### Production Environment

- **Hosting**: Lovable.dev platform with global CDN
- **Database**: Supabase PostgreSQL with auto-scaling
- **Storage**: Multi-provider (Filebase, S3, Arweave)
- **Blockchain**: Solana mainnet-beta / devnet
- **Monitoring**: Real-time performance and security monitoring

### Environment Configuration

```env
# Required secrets (stored in Supabase/Lovable Cloud)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
FILEBASE_ACCESS_KEY=your_filebase_access_key
FILEBASE_SECRET_KEY=your_filebase_secret_key
FILEBASE_BUCKET=your_filebase_bucket
FILEBASE_PINNING_TOKEN=your_filebase_pinning_token
STRIPE_SECRET_KEY=your_stripe_key
SOLANA_RPC_URL=your_solana_rpc
QUICKNODE_SOLANA_URL=your_quicknode_url
```

---

## Roadmap & Future Features

### In Development

- **Basenames Verification**: Complete Base chain domain verification
- **Mobile Apps**: Native iOS and Android applications
- **Gas Credits Top-Up**: Seamless transaction funding

### Planned Features

- **Layer 2 Support**: Polygon, Arbitrum, Optimism
- **DeFi Integration**: Yield farming and staking rewards
- **NFT Marketplace**: Built-in NFT storage and trading
- **Custom Branding**: White-label solutions for enterprises
- **API Expansion**: Comprehensive developer APIs

---

*This documentation is maintained and updated regularly. For the latest information, visit the BlockDrive platform or contact our support team.*
