# BlockDrive Technical Architecture

**Enterprise-Grade Document Infrastructure for the Tokenization Era**

---

## Architecture Philosophy

BlockDrive is built on three core principles:

1. **Security by Design** — Encryption and access control at every layer
2. **Composability** — Modular architecture that integrates with existing enterprise systems
3. **Compliance-First** — Audit trails, regulatory compliance, and institutional-grade controls

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Web App      │  │ Mobile Apps  │  │ Desktop App  │  │ Enterprise SDK   │ │
│  │ (React/Next) │  │ (React Nat.) │  │ (Electron)   │  │ (TypeScript)     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY LAYER                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ Supabase Edge Functions (Deno Runtime)                                │   │
│  │ • Authentication & Authorization                                       │   │
│  │ • Rate Limiting & DDoS Protection                                     │   │
│  │ • Request Routing & Load Balancing                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   DOCUMENT LAYER      │ │   FINANCIAL LAYER     │ │   IDENTITY LAYER      │
│                       │ │                       │ │                       │
│ • Encryption Engine   │ │ • Crossmint Wallets   │ │ • Clerk Auth          │
│ • Storage Orchestr.   │ │ • Payment Processing  │ │ • Session Management  │
│ • Access Control      │ │ • Yield Integration   │ │ • MFA/Passkeys        │
│ • Audit Logging       │ │ • Treasury Ops        │ │ • Enterprise SSO      │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│   STORAGE LAYER       │ │   BLOCKCHAIN LAYER    │ │   DATA LAYER          │
│                       │ │                       │ │                       │
│ • Cloudflare R2       │ │ • Solana (Metadata)   │ │ • Supabase PostgreSQL │
│   (Primary Storage)   │ │ • Arweave (Permanent) │ │   (User Data)         │
│ • Arweave             │ │ • Multi-Chain Support │ │ • Stripe Sync Engine  │
│   (Permanence)        │ │   (EVM via Crossmint) │ │   (Billing Data)      │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

---

## 1. Document Layer: "Programmed Incompleteness"

### Encryption Architecture

BlockDrive implements a proprietary encryption scheme called **"Programmed Incompleteness"** — a defense-in-depth approach where no single system holds enough information to decrypt user data.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENCRYPTION FLOW                                         │
│                                                                              │
│   ┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────┐  │
│   │  File    │───▶│  AES-256-GCM    │───▶│  Encrypted File               │  │
│   │          │    │  Encryption     │    │  (Stored in R2)               │  │
│   └──────────┘    └─────────────────┘    └──────────────────────────────┘  │
│                           │                                                  │
│                           ▼                                                  │
│                   ┌───────────────┐                                         │
│                   │  32-Byte Key  │                                         │
│                   └───────────────┘                                         │
│                           │                                                  │
│              ┌────────────┴────────────┐                                    │
│              ▼                         ▼                                    │
│   ┌──────────────────┐     ┌──────────────────┐                            │
│   │  First 16 Bytes  │     │  Last 16 Bytes   │                            │
│   │  (Solana PDA)    │     │  (User Device)   │                            │
│   └──────────────────┘     └──────────────────┘                            │
│                                                                              │
│   KEY RECONSTRUCTION: Both halves required for decryption                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Properties

| Property | Implementation |
|----------|----------------|
| **Algorithm** | AES-256-GCM (authenticated encryption) |
| **Key Size** | 256 bits (32 bytes) |
| **IV/Nonce** | Unique per file, stored with metadata |
| **Key Split** | 50/50 split between blockchain and client |
| **Key Storage** | On-chain (16 bytes) + Client device (16 bytes) |

### Security Guarantees

1. **BlockDrive Compromise** → Attacker gets encrypted blobs, no keys
2. **Blockchain Compromise** → Attacker gets half-keys, useless without client portion
3. **Client Device Compromise** → Attacker gets half-keys, useless without on-chain portion
4. **Coordinated Compromise** → All three systems must be breached simultaneously

---

## 2. Blockchain Layer: Multi-PDA Sharding

### Scalability Challenge

Solana PDAs have account size limits. Storing 1000+ files per user requires architectural innovation.

### Solution: Sharded Vault Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER VAULT HIERARCHY                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      USER VAULT MASTER                               │   │
│   │  PDA Seeds: ["vault_master", user_pubkey]                           │   │
│   │                                                                      │   │
│   │  • total_file_count: u64                                            │   │
│   │  • active_shard_index: u8                                           │   │
│   │  • shard_pointers: [Pubkey; MAX_SHARDS]                            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│   │ SHARD 0          │  │ SHARD 1          │  │ SHARD N          │        │
│   │ (100 files max)  │  │ (100 files max)  │  │ (100 files max)  │        │
│   │                  │  │                  │  │                  │        │
│   │ file_records:    │  │ file_records:    │  │ file_records:    │        │
│   │ [Pubkey; 100]    │  │ [Pubkey; 100]    │  │ [Pubkey; 100]    │        │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│              │                     │                     │                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                         FILE RECORD PDAs                              │ │
│   │  • file_id, owner, filename, size, encrypted_key_half, timestamps   │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      USER VAULT INDEX                                │   │
│   │  PDA Seeds: ["vault_index", user_pubkey]                            │   │
│   │                                                                      │   │
│   │  • entries: HashMap<file_id → (shard_index, slot_index)>            │   │
│   │  • O(1) file lookup across all shards                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Capacity Calculation

| Configuration | Capacity |
|---------------|----------|
| Files per shard | 100 |
| Max shards | 255 |
| **Max files per user** | **25,500** |
| Average file metadata | ~200 bytes |
| Master account size | ~8.5 KB |

---

## 3. Financial Layer: Crossmint Neobank Integration

### Wallet Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMBEDDED WALLET SYSTEM                                    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    CROSSMINT SMART CONTRACT WALLET                   │   │
│   │                                                                      │   │
│   │  Type: Non-custodial Smart Contract Wallet                          │   │
│   │  Chains: Solana, Base, Polygon, Ethereum, 40+ supported             │   │
│   │                                                                      │   │
│   │  Signer Options:                                                     │   │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │
│   │  │ Email/     │ │ Passkey    │ │ External   │ │ AWS KMS        │   │   │
│   │  │ Social     │ │ (Biometric)│ │ Wallet     │ │ (Enterprise)   │   │   │
│   │  └────────────┘ └────────────┘ └────────────┘ └────────────────┘   │   │
│   │                                                                      │   │
│   │  Properties:                                                         │   │
│   │  • No vendor lock-in (update signers without changing address)      │   │
│   │  • Multi-signer support (MFA, recovery, delegation)                 │   │
│   │  • Onchain permissions (auditable, enforceable)                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    TREASURY WALLET (Enterprise)                      │   │
│   │                                                                      │   │
│   │  • Multi-signature controls                                          │   │
│   │  • Spending limits                                                   │   │
│   │  • Role-based access                                                 │   │
│   │  • Automated workflows                                               │   │
│   │  • Cross-chain liquidity management                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAYMENT PROCESSING                                   │
│                                                                              │
│   FIAT PATH:                                                                 │
│   ┌────────┐    ┌─────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│   │ User   │───▶│ Stripe  │───▶│ Stripe Sync  │───▶│ public.subscribers  │ │
│   │ (Card) │    │ Checkout│    │ Engine       │    │ (Entitlements)      │ │
│   └────────┘    └─────────┘    └──────────────┘    └─────────────────────┘ │
│                                                                              │
│   CRYPTO PATH:                                                               │
│   ┌────────┐    ┌───────────┐    ┌──────────────┐    ┌─────────────────┐   │
│   │ User   │───▶│ Crossmint │───▶│ User Wallet  │───▶│ Treasury Wallet │   │
│   │ (USDC) │    │ Onramp    │    │ (Smart Cont.)│    │ (BlockDrive)    │   │
│   └────────┘    └───────────┘    └──────────────┘    └─────────────────┘   │
│                                                                              │
│   RECURRING CRYPTO (Automated):                                              │
│   ┌─────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│   │ pg_cron hourly  │───▶│ Edge Function    │───▶│ Crossmint Transfer   │  │
│   │ scheduler       │    │ (check balances) │    │ API (auto-debit)     │  │
│   └─────────────────┘    └──────────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Yield Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         YIELD INTEGRATION                                    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      USER STABLECOIN BALANCE                         │   │
│   │                              USDC                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│   ┌──────────────────────────┐    ┌──────────────────────────────────┐     │
│   │      Yield.xyz API       │    │        Direct Protocol           │     │
│   │  (Unified interface)     │    │        Integration               │     │
│   └──────────────────────────┘    └──────────────────────────────────┘     │
│                    │                               │                        │
│          ┌─────────┼─────────┐          ┌─────────┼─────────┐              │
│          ▼         ▼         ▼          ▼         ▼         ▼              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│   │  Aave    │ │  Morpho  │ │ Compound │ │  Other   │ │  Future  │        │
│   │  ~3-4%   │ │  ~3-5%   │ │  ~2-3%   │ │ Protocols│ │ Protocols│        │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                                              │
│   Revenue Model: BlockDrive retains spread between protocol yield           │
│                  and user-facing yield                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Compliance Architecture

### Regulated Transfers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLIANCE FLOW                                           │
│                                                                              │
│   ┌──────────┐                                                              │
│   │ Transfer │                                                              │
│   │ Request  │                                                              │
│   └────┬─────┘                                                              │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    CROSSMINT COMPLIANCE ENGINE                       │   │
│   │                                                                      │   │
│   │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────┐│   │
│   │  │ KYC/KYB    │  │ AML        │  │ Sanctions  │  │ Risk           ││   │
│   │  │ Verify     │  │ Screening  │  │ Check      │  │ Assessment     ││   │
│   │  └────────────┘  └────────────┘  └────────────┘  └────────────────┘│   │
│   │                                                                      │   │
│   │  ┌────────────────────────────────────────────────────────────────┐ │   │
│   │  │                    TRAVEL RULE COMPLIANCE                       │ │   │
│   │  │  • IVMS101 data exchange with counterparty VASPs               │ │   │
│   │  │  • Automatic for transfers > threshold                          │ │   │
│   │  └────────────────────────────────────────────────────────────────┘ │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                     │
│        ▼                                                                     │
│   ┌──────────────────┐    ┌──────────────────┐                             │
│   │ APPROVED         │    │ REJECTED         │                             │
│   │ Execute Transfer │    │ Log + Alert      │                             │
│   └──────────────────┘    └──────────────────┘                             │
│        │                                                                     │
│        ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         AUDIT TRAIL                                  │   │
│   │  • Immutable transaction records                                     │   │
│   │  • Compliance decision logs                                          │   │
│   │  • Regulatory reporting exports                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Enterprise Compliance Features

| Feature | Implementation |
|---------|----------------|
| **SOC-2 Type II** | In progress (target Q2 2026) |
| **AML/KYC** | Crossmint pre-licensed infrastructure |
| **Sanctions Screening** | Real-time global watchlist checks |
| **Travel Rule** | Automated IVMS101 compliance |
| **Audit Logs** | Immutable, exportable, retention policies |
| **Data Residency** | Configurable per jurisdiction |

---

## 5. Storage Layer

### Multi-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORAGE TIERS                                        │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TIER 1: HOT STORAGE (Cloudflare R2)                                 │   │
│   │                                                                      │   │
│   │  • Primary document storage                                          │   │
│   │  • Global edge distribution (200+ PoPs)                             │   │
│   │  • Sub-100ms retrieval latency                                       │   │
│   │  • S3-compatible API                                                 │   │
│   │  • Zero egress fees                                                  │   │
│   │                                                                      │   │
│   │  Cost: ~$0.015/GB/month                                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TIER 2: PERMANENT STORAGE (Arweave)                                 │   │
│   │                                                                      │   │
│   │  • Immutable document archival                                       │   │
│   │  • 200+ year data persistence guarantee                             │   │
│   │  • One-time payment model                                            │   │
│   │  • Proof-of-access consensus                                         │   │
│   │                                                                      │   │
│   │  Cost: ~$5/GB (one-time, permanent)                                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   Storage Strategy:                                                          │
│   • All files → R2 (hot access)                                             │
│   • Critical/legal files → R2 + Arweave (permanence)                        │
│   • Metadata → Solana (blockchain-verified)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Infrastructure & DevOps

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14, React, TypeScript | SSR, performance, type safety |
| **Backend** | Supabase Edge Functions (Deno) | Serverless, edge-deployed |
| **Database** | Supabase PostgreSQL | Managed, RLS, real-time |
| **Blockchain** | Solana (Anchor framework) | Speed, cost, developer experience |
| **Storage** | Cloudflare R2 + Arweave | Performance + permanence |
| **Auth** | Clerk | Enterprise SSO, MFA |
| **Payments** | Stripe + Crossmint | Fiat + crypto unified |
| **Monitoring** | Sentry, Vercel Analytics | Error tracking, performance |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEPLOYMENT                                           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  FRONTEND (Vercel)                                                   │   │
│   │  • Edge-deployed globally                                            │   │
│   │  • Automatic preview deployments                                     │   │
│   │  • Zero-config CI/CD from GitHub                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  BACKEND (Supabase)                                                  │   │
│   │  • Edge Functions (Deno, global deployment)                         │   │
│   │  • PostgreSQL (managed, replicated)                                  │   │
│   │  • Realtime subscriptions                                            │   │
│   │  • Row Level Security                                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  BLOCKCHAIN (Solana)                                                 │   │
│   │  • Program deployed to mainnet-beta                                  │   │
│   │  • Anchor framework for safety                                       │   │
│   │  • Helius RPC for reliability                                        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Measures

### Defense in Depth

| Layer | Protection |
|-------|------------|
| **Network** | Cloudflare WAF, DDoS protection |
| **Application** | Input validation, CSRF, XSS prevention |
| **Authentication** | MFA, passkeys, session management |
| **Authorization** | Row Level Security, role-based access |
| **Encryption** | AES-256-GCM, TLS 1.3, split-key architecture |
| **Blockchain** | PDA ownership verification, signature validation |
| **Audit** | Immutable logs, anomaly detection |

### Incident Response

- 24/7 monitoring via Sentry
- Automated alerting for anomalies
- Documented runbooks for common scenarios
- Regular security audits planned

---

## 8. Scalability Path

### Current Capacity

| Metric | Capacity |
|--------|----------|
| Users | Thousands |
| Files per user | 25,500 |
| Concurrent uploads | 100+ |
| Storage | Unlimited (R2) |

### Scaling Roadmap

| Phase | Enhancement |
|-------|-------------|
| **Phase 1** | Current architecture (sufficient for seed stage) |
| **Phase 2** | Database sharding, read replicas |
| **Phase 3** | Multi-region deployment |
| **Phase 4** | Enterprise-dedicated infrastructure |

---

## Conclusion

BlockDrive's technical architecture is designed for:

1. **Security** — Split-key encryption, no single point of compromise
2. **Scale** — Sharded PDAs, unlimited storage, global CDN
3. **Compliance** — Pre-licensed infrastructure, full audit trails
4. **Integration** — Embedded finance, enterprise-ready APIs

The architecture is production-ready for seed-stage traction and designed to scale with minimal re-architecture through Series A and beyond.
