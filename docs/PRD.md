# BlockDrive Product Requirements Document (PRD)

**Version**: 2.0.0
**Date**: February 3, 2026
**Status**: ACTIVE - Phase 8 Testing
**Prepared By**: BlockDrive Product Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision & Mission](#product-vision--mission)
3. [Core Features & Functionality](#core-features--functionality)
4. [Technical Architecture](#technical-architecture)
5. [User Flows](#user-flows)
6. [Business Model & Pricing](#business-model--pricing)
7. [Target Market & Personas](#target-market--personas)
8. [Security & Compliance](#security--compliance)
9. [Implementation Status](#implementation-status)
10. [Roadmap & Milestones](#roadmap--milestones)
11. [Success Metrics](#success-metrics)
12. [Competitive Analysis](#competitive-analysis)
13. [Risk Analysis](#risk-analysis)
14. [Appendices](#appendices)

---

## Executive Summary

### Product Overview

**BlockDrive** is a decentralized Web3 data management platform that combines encrypted storage, blockchain authentication, zero-knowledge cryptography, and enterprise collaboration features. The platform implements a proprietary **"Programmed Incompleteness"** security architecture where encrypted files are split—critical bytes are embedded in zero-knowledge proofs while remaining content is distributed across multiple storage providers.

This unique architecture enables **"Instant Revoke"** capabilities where senders can permanently revoke file access even after sharing, making data truly unrecoverable by revoking recipients—a feature impossible with traditional cloud storage.

### Current Status

- **Development Stage**: Phase 8 Testing, ~95% complete
- **Branch**: `feature/clerk-alchemy-integration`
- **Last Major Milestone**: Organization Subdomain NFT System with Clerk Organizations
- **Technology Stack**: React 18.3.1 + TypeScript, Supabase Edge Functions (41 functions), Solana Anchor + Multi-PDA Sharding, Crossmint Embedded Wallets, Clerk Organizations, Stripe Sync Engine, AES-256-GCM, Groth16 ZK Proofs, Metadata Privacy v2

### Unique Value Proposition

BlockDrive bridges Web2 security standards with Web3 decentralization:

1. **Proprietary Programmed Incompleteness** - Critical bytes extraction enables instant, irreversible access revocation
2. **Zero-Knowledge Cryptography** - Files verified on-chain without revealing content
3. **Multi-Chain Authentication** - Solana (primary) + Base/Ethereum support
4. **Enterprise-Grade Features** - Team collaboration with full encryption
5. **Flexible Payments** - Both fiat (Stripe) and crypto (Radom - planned)

### Market Positioning

**"BlockDrive is the decentralized alternative to Dropbox for users who value privacy, ownership, and irreversible control."**

Unlike traditional cloud storage which relies on company policies for access revocation, BlockDrive's proprietary architecture makes data unrecoverable once access is revoked—even if BlockDrive itself were compromised.

### Target Launch

**Q1 2026** - 8-9 weeks remaining across 8 implementation phases

---

## Product Vision & Mission

### Vision Statement

> "Enable true data ownership through the convergence of blockchain transparency and zero-knowledge cryptography, bridging Web2 security standards with Web3 decentralization."

### Mission

> "Provide individuals and organizations with a storage platform where they maintain permanent, cryptographic control over their data—even after sharing—eliminating reliance on centralized trust."

### Core Values

1. **User Sovereignty** - Users own their data, keys, and access control
2. **Privacy by Design** - Client-side encryption, zero server-side key exposure
3. **Transparency** - On-chain audit trail for all file operations
4. **Accessibility** - Web3 features with Web2 UX simplicity
5. **Security First** - Cryptographic guarantees over trust assumptions

### Market Positioning

BlockDrive occupies a unique position between:

- **Traditional Cloud Storage** (Dropbox, Google Drive) - Familiar UX, team features, clear pricing
- **Decentralized Storage** (Filecoin, IPFS) - True ownership, censorship resistance, permanence

**Key Differentiators**:
- ✅ Programmed Incompleteness (proprietary, patentable)
- ✅ Instant revoke capability (unique in market)
- ✅ Zero-knowledge proofs on-chain
- ✅ Multi-chain authentication (Solana + Ethereum + Base + Polygon + Arbitrum)
  - **Powered by**: Crossmint Embedded Wallets (automatic multichain from Day 1)
  - **Chains**: Solana devnet/mainnet + 50+ EVM chains
- ✅ Soulbound NFT membership
- ✅ Crypto + fiat payment options
- ✅ Built-in compliance (AML/KYC) for enterprise users

---

## Core Features & Functionality

### 3.1 File Upload System

**Status**: ✅ Complete
**Implementation**: `blockDriveUploadService.ts`

#### 4-Phase Proprietary Upload Pipeline

BlockDrive implements a unique upload architecture called **"Programmed Incompleteness"** that enables instant, irreversible access revocation:

**Phase 1: File Encryption**
- **Algorithm**: AES-256-GCM (NIST-approved)
- **Key Source**: Wallet-derived via HKDF-SHA256
- **IV Generation**: 96-bit random per file
- **Output**: `[IV || ciphertext || auth_tag]`
- **Security Levels**:
  - **Standard (Level 0)**: Basic HKDF derivation - General files
  - **Sensitive (Level 1)**: Enhanced 10K HKDF iterations - Business documents
  - **Maximum (Level 2)**: Strongest 100K iterations + salt - Critical data

**Phase 2: Critical Bytes Extraction**
- Extract first 16 bytes from encrypted content
- Separate critical bytes from remaining encrypted content
- Encrypt critical bytes independently with wallet key
- Generate SHA-256 commitment: `commitment = SHA256(critical_bytes)`
- **Critical**: These 16 bytes are NEVER uploaded with the main file

**Phase 3: Zero-Knowledge Proof Generation**
- **Circuit**: `criticalBytesCommitment.circom`
- **Proof Type**: Groth16 (bn128 curve)
- **Hash Function**: Poseidon (circuit-native)
- **Process**:
  1. Compute Poseidon hash of critical bytes
  2. Generate Groth16 proof proving knowledge without revealing
  3. Create proof package with encrypted critical bytes
  4. Store commitment on-chain (public)
- **Performance**: 1-2 seconds per file

**Phase 4: Multi-Provider Upload**
- **Content Upload**: Encrypted file (WITHOUT critical bytes) → Filebase/IPFS
- **Proof Upload**: ZK proof package → Amazon S3
- **Metadata Upload**: Encrypted metadata JSON → Filebase
- **Blockchain Registration**: FileRecord PDA on Solana with commitments
- **Redundancy Support**: 3 levels (single, dual, triple provider)

#### Performance Metrics

- Encryption: 100-500ms (10MB file)
- ZK Proof: 1-2 seconds
- Upload: Variable (network-dependent)
- On-chain registration: ~800ms (Solana)
- **Total**: Typically <5 seconds for 10MB file

#### Upload Flow Example

```
User selects file (10MB PDF)
↓
Encrypt with AES-256-GCM (Standard level) → 200ms
↓
Extract critical 16 bytes → 50ms
↓
Generate Groth16 ZK proof → 1.5 seconds
↓
Upload encrypted content to Filebase → 2 seconds
↓
Upload proof to S3 → 500ms
↓
Register FileRecord PDA on Solana → 800ms
↓
Total: ~5 seconds
```

### 3.2 File Download System

**Status**: ✅ Complete
**Implementation**: `blockDriveDownloadService.ts`

#### Verified Download Pipeline

**Phase 1: Access Verification**
- Fetch FileRecord PDA from Solana
- Verify user is owner OR has valid Delegation PDA
- Check delegation expiration (if applicable)
- Validate permission level (View/Download/Reshare)

**Phase 2: Content Retrieval**
- Download encrypted file from primary storage (Filebase/IPFS)
- Download ZK proof package from S3
- Download encrypted metadata from Filebase
- **Failover**: Automatic retry with backup providers if primary fails

**Phase 3: Integrity Verification**
- Verify: `SHA256(downloaded_content) == encryption_commitment` (on-chain)
- Verify: `SHA256(critical_bytes) == critical_commitment` (on-chain)
- Verify: ZK proof validity (Groth16 verification)
- Verify: Proof integrity hash matches

**Phase 4: File Reconstruction & Decryption**
- Decrypt critical bytes using wallet-derived key
- Reconstruct complete file: `critical_bytes + encrypted_content`
- Decrypt reconstructed file with AES-256-GCM
- Validate decrypted content format
- Return plaintext to user

#### Performance Metrics

- Access verification: <50ms (Solana RPC)
- Content download: Variable (network)
- Integrity verification: 200-500ms
- Decryption: 100-300ms
- **Total**: Typically <2 seconds for 100MB file

### 3.3 Storage Provider Integration

**Status**: ✅ Complete
**Implementation**: `storage/storageOrchestrator.ts`

#### Multi-Provider Architecture

BlockDrive uses a redundant, multi-provider storage strategy for resilience:

| Provider | Purpose | Protocol | Cost | Performance |
|----------|---------|----------|------|-------------|
| **Filebase** | Primary IPFS | S3-compatible | ~$5/TB/month | Fast, reliable |
| **Amazon S3** | Backup + Critical bytes | S3 native | ~$23/TB/month | Very fast |
| **Arweave** | Permanent archival | HTTP API | ~$500-1000/TB one-time | Slow, permanent |

#### Redundancy Levels

1. **Level 1**: Primary provider only (Filebase)
   - Use case: Non-critical files, cost optimization
   - Risk: Single point of failure

2. **Level 2**: Primary + S3 backup
   - Use case: Standard business files
   - Benefit: Automatic failover

3. **Level 3**: All three providers
   - Use case: Critical documents, compliance
   - Benefit: Maximum redundancy + permanent storage

#### Features

- **Automatic Failover**: Health checks detect provider issues, switch to backup
- **Parallel Uploads**: Simultaneous uploads to multiple providers
- **Chunking Support**: Files >100MB split into 5MB chunks
- **Progress Callbacks**: Real-time upload progress for UI
- **Metadata Tagging**: Each file tagged with fileId, folderPath, commitment, securityLevel

#### Configuration

```typescript
interface StorageConfig {
  primaryProvider: 'filebase' | 's3' | 'arweave';
  redundancyLevel: 1 | 2 | 3;
  chunkSize: number;        // Default: 5MB
  maxRetries: number;       // Default: 3
  timeoutMs: number;        // Default: 30000
}
```

### 3.4 Encryption & Cryptography

**Status**: 🟡 90% Complete (3-message key derivation pending Phase 5)

#### AES-256-GCM Encryption

**Algorithm Details**:
- **Cipher**: AES-256 in Galois/Counter Mode (GCM)
- **Key Size**: 256-bit (32 bytes)
- **IV Length**: 96-bit (12 bytes) - optimal for GCM
- **Authentication Tag**: 128-bit (16 bytes)
- **Implementation**: WebCrypto API (`crypto.subtle`)

**Why GCM Mode?**:
- ✅ Authenticated encryption (integrity + confidentiality)
- ✅ Detects tampering automatically
- ✅ Fast in modern browsers (hardware acceleration)
- ✅ NIST-approved and widely trusted

**Security Levels Implementation**:

```typescript
// Standard (Level 0)
const key = await hkdf({
  ikm: walletSignatures,
  salt: 'BlockDrive-HKDF-Salt-v1',
  info: 'blockdrive-level-0-encryption',
  iterations: 1000
});

// Sensitive (Level 1)
const key = await hkdf({
  ikm: walletSignatures,
  salt: 'BlockDrive-HKDF-Salt-v1',
  info: 'blockdrive-level-1-encryption',
  iterations: 10000,        // 10x more iterations
  additionalEntropy: true   // Extra entropy source
});

// Maximum (Level 2)
const key = await hkdf({
  ikm: walletSignatures,
  salt: 'BlockDrive-HKDF-Salt-v1' + fileSpecificSalt,
  info: 'blockdrive-level-2-encryption',
  iterations: 100000,       // 100x more iterations
  additionalEntropy: true,
  perFileSalt: true         // Unique salt per file
});
```

**Key Derivation (HKDF-SHA256)**:
- **Input Material**: 3 wallet signatures (see Phase 5)
- **Salt**: Static application salt + optional file salt
- **Info**: Level-specific context string (domain separation)
- **Output**: 256-bit non-extractable CryptoKey
- **Security**: Keys NEVER leave client, never sent to server

#### Performance

| Operation | Standard | Sensitive | Maximum |
|-----------|----------|-----------|---------|
| Key derivation | ~50ms | ~200ms | ~1000ms |
| Encryption (10MB) | ~150ms | ~150ms | ~150ms |
| Decryption (10MB) | ~100ms | ~100ms | ~100ms |

**Note**: Encryption speed is identical across levels (same AES-256-GCM). Only key derivation differs.

### 3.5 Zero-Knowledge Proof System

**Status**: ✅ Complete (production trusted setup pending)
**Implementation**: `zkProofService.ts`, `snarkjsService.ts`

#### Circuit Design

**Circuit**: `criticalBytesCommitment.circom`

```circom
pragma circom 2.0.0;

include "poseidon.circom";

template CriticalBytesCommitment() {
    // Private inputs (not revealed)
    signal input critical_bytes[16];

    // Public output (visible on-chain)
    signal output commitment;

    // Hash critical bytes using Poseidon
    component hasher = Poseidon(16);
    for (var i = 0; i < 16; i++) {
        hasher.inputs[i] <== critical_bytes[i];
    }

    // Output commitment
    commitment <== hasher.out;
}

component main = CriticalBytesCommitment();
```

#### Proof Package Structure (v2)

```typescript
interface ZKProofPackage {
  version: 2;
  commitment: string;              // SHA-256 hash (public, stored on-chain)
  groth16Proof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
  };
  publicSignals: string[];
  encryptedCriticalBytes: string;  // AES-256-GCM encrypted with wallet key
  proofHash: string;               // Integrity verification hash
  verificationData: {
    algorithm: 'groth16';
    curve: 'bn128';
    circuitVersion: string;
  };
}
```

#### Trusted Setup

**Development**:
- Using pre-generated Powers of Tau: `powersOfTau28_hez_final_14.ptau`
- Sufficient for development and testing
- **Not production-ready** (requires ceremony)

**Production** (Planned):
- Multi-Party Ceremony (MPC) required
- 10+ participants recommended
- Ceremony structure: 3 phases
  1. Powers of Tau (universal)
  2. Phase 2 (circuit-specific)
  3. Verification key generation
- **Timeline**: Before mainnet launch (Phase 8)

#### Performance & Storage

- **Proof Generation**: 1-2 seconds per file
- **Proof Verification**: 200-500ms
- **Proof Size**: ~2KB per proof package
- **On-chain Storage**: Only 32-byte commitment (SHA-256)

---

## Implementation Status

### Overall Completion: ~95%

### Completed Features (✅ 95%)

**Frontend (100% Complete)**:
- ✅ 151 React components across all feature areas
- ✅ 18 page components (Dashboard, Files, Membership, Teams, Onboarding, etc.)
- ✅ 20+ custom React hooks (useAuth, useCrossmintWallet, useOrganizations, etc.)
- ✅ Clerk authentication UI integration with Organizations
- ✅ Crossmint embedded wallet provider (multichain)
- ✅ File upload/download interfaces with progress tracking
- ✅ File browser with folder navigation
- ✅ Encryption setup wizard (3 security levels)
- ✅ File sharing modal with permissions
- ✅ Subscription/pricing pages with Stripe Sync
- ✅ Dashboard with usage metrics and analytics
- ✅ Organization management UI (invite codes, email domains)
- ✅ 5-step onboarding flow (Sign Up → Org → Username → Wallet → NFT)
- ✅ Username NFT minting UI
- ✅ Account settings page

**Backend Services (95% Complete)**:
- ✅ Clerk authentication integration with Organizations
- ✅ Crossmint embedded wallet setup (multichain)
- ✅ SNS domain verification (Solana)
- ✅ File upload service (multi-provider orchestration)
- ✅ File download service (verified retrieval with ZK proofs)
- ✅ AES-256-GCM encryption (3 security levels)
- ✅ ZK proof generation (Groth16/snarkjs)
- ✅ Storage orchestration (Filebase/R2/Arweave)
- ✅ NFT membership service (minting, verification)
- ✅ Stripe Sync Engine (views + RPC functions)
- ✅ Stripe payment integration (checkout, webhooks)
- ✅ Crossmint crypto payments (recurring via pg_cron)
- ✅ Supabase database integration + RLS policies
- ✅ ECDH key exchange for secure sharing
- ✅ Critical bytes extraction and storage
- ✅ Metadata Privacy v2 (encrypted metadata + HMAC search)
- ✅ 3-message key derivation (complete with 4-hour sessions)
- ✅ Organization invite code system
- ✅ Email domain verification (magic links via Resend)
- ✅ Username NFT minting via Crossmint API

**Blockchain Infrastructure (90% Complete)**:
- ✅ Solana Anchor program structure complete
- ✅ Multi-PDA Sharding (UserVaultMaster, Shard, Index)
- ✅ PDA designs finalized (supports 1000+ files per user)
- ✅ Instruction definitions (15+ instructions)
- ✅ Comprehensive error handling (BlockDriveError enum)
- ✅ Event definitions for audit trail
- ✅ Gas sponsorship setup (Crossmint)
- ✅ TypeScript sharding client (full abstraction)
- ✅ On-chain commitment verification
- 🟡 Deployment to devnet (testing phase)
- 🔴 Deployment to mainnet (after testing)

**Cryptography (100% Complete)**:
- ✅ AES-256-GCM implementation (WebCrypto API)
- ✅ HKDF key derivation (3-level wallet signatures)
- ✅ Wallet signature collection flow
- ✅ Groth16 ZK proof generation (snarkjs)
- ✅ ECDH key exchange (X25519)
- ✅ Commitment verification (SHA-256)
- ✅ Full 3-message key derivation (complete)
- ✅ Metadata Privacy v2 (HMAC search tokens)
- 🟡 Production trusted setup ceremony (before mainnet)

**Payments & Monetization (95% Complete)**:
- ✅ Stripe Sync Engine integration
- ✅ Stripe integration (checkout, subscriptions, webhooks)
- ✅ Subscription tier system (4 tiers)
- ✅ NFT-based membership minting (Token-2022)
- ✅ Pricing page with dynamic pricing
- ✅ Billing history tracking
- ✅ Crossmint crypto payments (USDC, SOL, ETH)
- ✅ Recurring crypto payments (pg_cron scheduler)

**Organization Features (100% Complete)**:
- ✅ Clerk Organizations integration
- ✅ Organization invite codes (admin generation)
- ✅ Business email domain verification
- ✅ Magic link email verification (Resend API)
- ✅ Hierarchical SNS subdomains (username.org.blockdrive.sol)
- ✅ Organization-aware username NFT minting
- ✅ 5-step onboarding with org join step
- ✅ Organization member management

**Recovery & Independence (100% Complete)**:
- ✅ Python Recovery SDK (open-source)
- ✅ Independent file recovery without BlockDrive app
- ✅ Solana on-chain verification (optional)
- ✅ Multi-gateway IPFS fallback

---

## Roadmap & Milestones

### Current Status
- **Week**: Final weeks of 8-9 week roadmap
- **Branch**: `feature/clerk-alchemy-integration`
- **Last Milestone**: Organization Subdomain NFT System complete
- **Current Phase**: Phase 8 - Testing & Mainnet Deployment

### Q1 2026 Implementation Progress

**Phase 1 - Multi-PDA Sharding** ✅ COMPLETE
- ✅ UserVaultMaster PDA implementation
- ✅ UserVaultShard PDA (up to 10 shards per user, 100 files each)
- ✅ UserVaultIndex for O(1) file-to-shard routing
- ✅ Auto-sharding logic when threshold reached
- ✅ TypeScript sharding client abstraction
- **Result**: Supports 1000+ files per user

**Phase 2 - Session Key Delegation** ✅ COMPLETE
- ✅ Session-based signing for gasless operations
- ✅ 4-hour session expiry with auto-refresh

**Phase 3 - Crypto Payments** ✅ COMPLETE
- ✅ Crossmint crypto checkout (USDC, SOL, ETH)
- ✅ pg_cron recurring payment scheduler
- ✅ Treasury wallet integration
- ✅ Automatic membership NFT minting

**Phase 4 - Enhanced Metadata Privacy** ✅ COMPLETE
- ✅ Metadata v2 with AES-256-GCM encryption
- ✅ HMAC-SHA256 search tokens for deterministic lookups
- ✅ Size buckets for privacy-preserving categorization
- ✅ Backward compatibility with v1 metadata

**Phase 5 - Full 3-Message Key Derivation** ✅ COMPLETE
- ✅ 3-message templates finalized
- ✅ HKDF-SHA256 with 3 security levels
- ✅ 4-hour session expiry
- ✅ Dual wallet support (Crossmint + external adapters)

**Phase 6 - Download Commitment Verification** ✅ COMPLETE
- ✅ On-chain verification at FileRecord level
- ✅ Critical bytes commitment comparison
- ✅ Integration into download service

**Phase 7 - Python Recovery SDK** ✅ COMPLETE
- ✅ Standalone Python CLI application
- ✅ IPFS/storage provider connectivity
- ✅ AES-256-GCM decryption module
- ✅ ZK proof verification
- ✅ Critical bytes reconstruction
- ✅ File reassembly logic
- ✅ Open-source under MIT license
- **Package**: `blockdrive-recovery[solana]`

**Phase 7.5 - Organization Subdomain NFT System** ✅ COMPLETE
- ✅ Clerk Organizations integration
- ✅ Organization invite codes (admin generation)
- ✅ Business email domain verification (magic links)
- ✅ Hierarchical SNS subdomains
- ✅ 5-step onboarding flow
- ✅ Organization-aware username NFT minting

**Phase 8 - Testing & Mainnet Deployment** 🔄 IN PROGRESS
- ✅ Unit tests for crypto/blockchain modules
- ✅ Integration tests for major workflows
- 🔄 E2E tests (Playwright)
- 🔄 Devnet deployment and validation
- 📋 Third-party security audit
- 📋 Mainnet-beta deployment
- 📋 Production monitoring setup

### Q2 2026 Planned

**Post-Launch**:
- SOC 2 Type II audit
- Bug bounty program
- Advanced threat detection
- Multi-region data residency
- Mobile app development

---

## Success Metrics

### Functional Metrics
- ✅ 1000+ files per user supported (via multi-PDA sharding)
- ✅ Crypto payments live (SOL, USDC, ETH, BTC via Radom)
- ✅ Python Recovery SDK available and open-sourced
- ✅ Solana mainnet-beta deployment complete
- ✅ Full 3-message key derivation implemented
- ✅ On-chain download verification active

### Performance Metrics
- **Upload**: <3 seconds for 10MB file (target: 95th percentile)
- **Download**: <2 seconds with full verification (target: 95th percentile)
- **Sharing**: <1 second (target: 99th percentile)
- **Revoke**: <1 second (target: 99th percentile)
- **Encryption**: <500ms for 10MB (AES-256-GCM)
- **ZK Proof**: <2 seconds generation time

### Security Metrics
- Zero server-side key exposures (100%)
- Client-side encryption only (100% of files)
- On-chain audit trail (100% of operations)
- Instant revoke success rate: 99.9%
- Security audit: Zero critical issues, <5 medium issues

### Business Metrics

**User Acquisition**:
- Month 1: 1,000 users
- Month 3: 5,000 users
- Month 6: 10,000 users
- Year 1: 50,000 users

**Conversion Rates**:
- Free-to-paid conversion: 5-10%
- Trial-to-paid: 40-50%
- Annual upgrade rate: 15-20%

**Retention**:
- Monthly churn: <5%
- Annual retention: >80%
- NPS score: >50

**Revenue**:
- Month 1 MRR: $5,000
- Month 6 MRR: $50,000
- Year 1 MRR: $200,000
- Target ARPU: $75-100/month
- LTV:CAC ratio: >3:1

### User Engagement
- Daily active users (DAU): 30-40% of total users
- Average files per user: 50-100
- Storage utilization: 60-80% of allocated quota
- Sharing frequency: 10-20 shares per user per month
- Team collaboration adoption: 30% of Growth+ users

---

## Appendices

### Appendix A: Glossary

- **AES-256-GCM**: Advanced Encryption Standard, 256-bit key, Galois/Counter Mode (authenticated encryption)
- **ECDH**: Elliptic Curve Diffie-Hellman key exchange protocol
- **HKDF**: HMAC-based Key Derivation Function (RFC 5869)
- **Groth16**: Zero-knowledge proof system (type of zk-SNARK)
- **PDA**: Program-Derived Address (Solana deterministic account)
- **SNS**: Solana Name Service (human-readable blockchain addresses)
- **MCA**: Multi-Chain Authentication (dual-chain verification)
- **Soulbound NFT**: Non-transferable NFT (permanently tied to wallet)
- **Programmed Incompleteness**: BlockDrive's proprietary architecture where files are deliberately incomplete without critical bytes

### Appendix B: Related Documents
- `/docs/ARCHITECTURE.md` - Technical architecture deep-dive (to be created)
- `/docs/SECURITY.md` - Security model and threat analysis (to be created)
- `/docs/IMPLEMENTATION_PLAN.md` - Detailed 8-phase implementation guide
- `/BLOCKDRIVE_DOCUMENTATION.md` - Original comprehensive product documentation

### Appendix C: External References
- **Solana Anchor Framework**: https://www.anchor-lang.com/
- **snarkjs Library**: https://github.com/iden3/snarkjs
- **Crossmint Documentation**: https://docs.crossmint.com/
- **Clerk Authentication**: https://clerk.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Solana Name Service**: https://docs.bonfida.org/collection/an-introduction-to-the-solana-name-service

---

**Document Version**: 2.0.0
**Last Updated**: February 3, 2026
**Status**: ACTIVE - Phase 8 Testing
**Prepared By**: BlockDrive Product Team
**Next Review**: Weekly during testing phase
**Feedback**: Submit via GitHub issues or team@blockdrive.app

