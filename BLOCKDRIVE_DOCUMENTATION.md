# BlockDrive Platform Documentation — v1.0.0

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
- Clerk for identity + Crossmint for embedded Solana wallets
- Solana Anchor program for on-chain file registry
- EVM wallets (MetaMask/Coinbase) supported for Clerk auth only
- SNS (.sol) and Basenames (.base) domain verification

**Cryptography:**
- AES-256-GCM encryption with 3 security levels (Standard, Sensitive, Maximum)
- Zero-Knowledge Proofs (snarkjs/Groth16)
- ECDH key exchange for secure file sharing
- Security-question-derived encryption keys via HKDF-SHA256
- Session-persistent key caching (sessionStorage, 4-hour expiry)

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
- **Primary Provider**: Filebase (S3-compatible IPFS API) via Cloudflare Worker gateway
- **Redundancy**: Cloudflare R2 for ZK proofs, Arweave for permanent archival
- **Folder Management**: Create, delete, and navigate folders; drag-and-drop file organization; move-to-folder modal
- **Directory Filtering**: Files displayed only at current folder level, clean hierarchical navigation
- **Permanent Storage**: Files pinned for guaranteed availability
- **Global CDN**: Fast access through gateway network

### 3. Authentication & Wallets
- **Identity**: Clerk (email, social login, organizations)
- **Embedded Wallets**: Crossmint MPC wallets on Solana with gas sponsorship
- **External Wallets**: MetaMask, Coinbase Wallet (Clerk auth only, not embedded)
- **Secure Authentication**: No private keys exposed to the application

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

### Security-Question Key Derivation

Keys are derived from a personal security question answer, not wallet signatures:

1. User sets a security question on first use (stored server-side)
2. Answer hash (SHA-256) sent to `derive-key-material` edge function
3. Server returns key material for all 3 security levels
4. Client derives AES-256-GCM CryptoKeys via HKDF-SHA256
5. Answer hash cached in `sessionStorage` — keys auto-restore on page refresh
6. Session expires after 4 hours or when the browser tab closes

```typescript
// Keys derived client-side from security question answer
const keyMaterials = await supabase.functions.invoke('derive-key-material', {
  body: { answer_hash: answerHash }
});
const key = await deriveKeyFromMaterial(material, SecurityLevel.MAXIMUM);
// Keys never leave the browser
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
- **Cloudflare R2**: ZK proof storage and critical bytes
- **Arweave (Optional)**: Permanent archival storage

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

| Plan | Price | Storage | Team Members |
|------|-------|---------|--------------|
| **Pro** | $15/mo | 1 TB (+$10/mo per additional TB) | 1 user |
| **Scale** | $29/seat/mo | 2 TB/seat (+$10/seat/mo per additional TB) | 2-99 seats |
| **Enterprise** | Custom | Custom | 100+ seats |

All plans include 7-day free trial, blockchain auth, and Programmed Incompleteness.

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
- **Scale Plan**: 2-99 seats, Clerk Organizations + SSO
- **Enterprise Plan**: 100+ seats, SSO/SAML, whitelabeling

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
| **Pro** | $15 | $40 | $149 | 1 TB (+$10/mo per additional TB) |
| **Scale** | $29/seat | $79/seat | $299/seat | 2 TB/seat (+$10/seat/mo per additional TB) |
| **Enterprise** | Custom | Custom | Custom | Custom allocation |

Scale requires 2-seat minimum (2-99 seats). Enterprise: 100+ seats, SSO/SAML, whitelabeling, dedicated account manager.

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
| `upload-to-ipfs` | Handle file uploads to IPFS via Worker gateway |
| `derive-key-material` | Derive encryption key materials from security answer hash |
| `security-question` | Get, set, and verify security questions |
| `clerk-webhook` | Handle Clerk user/org events, provision storage folders |
| `check-subscription` | Verify user subscription status |
| `create-checkout` | Process Stripe payments |
| `send-team-invitation` | Handle team invitations |
| `mca-start` | Initiate multichain authentication |
| `mca-verify` | Verify signatures and domain ownership |
| `mca-check` | Validate JWT tokens |

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

- **Hosting**: Vercel/Cloudflare with global CDN
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

## v1.0.0 Release Notes

This is the first fully functional build of BlockDrive, completing all core features:

- End-to-end encrypted file upload, download, and preview
- Security-question-based key derivation with session persistence
- Folder management with drag-and-drop and directory navigation
- Solana on-chain file registry with ZK proofs (Groth16)
- On-chain file sharing via delegation PDAs
- Clerk + Crossmint authentication with embedded Solana wallets
- Stripe + crypto payment processing
- Organization/team file management

### Planned Features

- **Mobile Apps**: Native iOS and Android applications
- **Layer 2 Support**: Polygon, Arbitrum, Optimism
- **Custom Branding**: White-label solutions for enterprises
- **API Expansion**: Comprehensive developer APIs

---

*BlockDrive v1.0.0 — February 2026*
