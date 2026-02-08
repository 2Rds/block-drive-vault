# BlockDrive Technical Architecture

**Programmed Incompleteness: A New Paradigm in Data Security**

---

## Architecture Philosophy

BlockDrive is built on a single, radical premise:

**Files should never exist in complete, usable form on any system—public or private.**

This is not encryption. Encryption protects files that exist. Programmed Incompleteness ensures complete files **never exist**.

---

## 1. The Core Innovation: Programmed Incompleteness

### The Fundamental Problem

Every existing storage solution has the same vulnerability:

```
TRADITIONAL ARCHITECTURE:
┌─────────────┐     ┌─────────────────────┐
│  User File  │ ──▶ │  Complete File      │ ◀── ATTACK SURFACE
│             │     │  (Encrypted or not) │
└─────────────┘     │  STORED SOMEWHERE   │
                    └─────────────────────┘
```

Whether centralized (Dropbox) or decentralized (Storj), whether encrypted or not—**complete files exist somewhere**. This creates an irreducible attack surface.

### The BlockDrive Solution

```
PROGRAMMED INCOMPLETENESS:
┌─────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  User File  │ ──▶ │  Encrypted File     │ ──▶ │  INCOMPLETE      │
│             │     │  (AES-256-GCM)      │     │  Encrypted File  │
└─────────────┘     └─────────────────────┘     │  (Missing 16B)   │
                              │                  └──────────────────┘
                              │                           │
                              ▼                           ▼
                    ┌─────────────────┐         ┌─────────────────┐
                    │  16 Critical    │         │   FILEBASE/IPFS │
                    │  Bytes Extracted│         │                 │
                    └─────────────────┘         │   CRYPTOGRAPHIC │
                              │                 │   GARBAGE       │
                              ▼                 └─────────────────┘
                    ┌─────────────────┐
                    │  ZK Proof +     │
                    │  Encrypted 16B  │ ──▶ CLOUDFLARE R2
                    │  + Commitment   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  SOLANA         │
                    │  Commitment Hash│ ──▶ IMMUTABLE VERIFICATION
                    │  + Metadata CID │
                    └─────────────────┘
```

**Result:** No single system—or even all systems combined—contains enough information to reconstruct the file.

---

## 2. Cryptographic Architecture

### Key Derivation

BlockDrive exploits wallet-based authentication as a cryptographic identity:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        KEY DERIVATION SYSTEM                                 │
│                                                                              │
│   USER WALLET                                                                │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  Private Key (never leaves device)                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    Signs three specific messages                            │
│                                    │                                         │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│   │ "BlockDrive      │  │ "BlockDrive      │  │ "BlockDrive      │        │
│   │  Security L1"    │  │  Security L2"    │  │  Security L3"    │        │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│              │                     │                     │                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│   │  Signature 1     │  │  Signature 2     │  │  Signature 3     │        │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│              │                     │                     │                  │
│              └─────────────────────┼─────────────────────┘                  │
│                                    │                                         │
│                         Key Derivation Function (KDF)                       │
│                                    │                                         │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│   │  AES-256 Key L1  │  │  AES-256 Key L2  │  │  AES-256 Key L3  │        │
│   │  (Standard)      │  │  (Sensitive)     │  │  (Critical)      │        │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                              │
│   PROPERTIES:                                                                │
│   • Deterministic: Same wallet + same message = same key, always           │
│   • Never transmitted: Keys derived client-side only                        │
│   • Never stored: Regenerated on-demand from wallet signatures              │
│   • Three security levels: User chooses per-file sensitivity               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### The 16-Byte Extraction Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       16-BYTE EXTRACTION                                     │
│                                                                              │
│   ENCRYPTED FILE (after AES-256-GCM encryption)                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ [16 BYTES] [REST OF ENCRYPTED FILE................................] │   │
│   │     ▲                          ▲                                     │   │
│   │     │                          │                                     │   │
│   │  CRITICAL                   INCOMPLETE                               │   │
│   │  EXTRACTED                  UPLOADED TO STORAGE                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   THE CRITICAL 16 BYTES:                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  1. Hash generated (SHA-256) → COMMITMENT                           │   │
│   │  2. ZK proof generated → Proves possession without revealing        │   │
│   │  3. Encrypted with wallet-derived key                               │   │
│   │  4. Embedded in ZK proof structure                                  │   │
│   │  5. Stored on Cloudflare R2 (reliability)                          │   │
│   │  6. Commitment hash stored on Solana (verification)                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   WITHOUT THE 16 BYTES:                                                     │
│   • File cannot be decrypted (AES-256 requires complete ciphertext)        │
│   • No mathematical attack can recover them from incomplete file           │
│   • Even with decryption key, incomplete file = garbage                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Zero-Knowledge Proof Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ZERO-KNOWLEDGE PROOF SYSTEM                             │
│                                                                              │
│   THE PROOF DEMONSTRATES:                                                    │
│   "I possess 16 bytes that, hashed, produce this commitment—                │
│    without revealing what those bytes are."                                  │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         ZK PROOF STRUCTURE                           │   │
│   │                                                                      │   │
│   │  • Mathematical proof of 16-byte possession                         │   │
│   │  • Encrypted 16 bytes (only wallet holder can decrypt)              │   │
│   │  • Commitment verification data                                      │   │
│   │  • Timestamp and file metadata references                           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   VERIFICATION FLOW:                                                         │
│   1. Anyone can verify proof is mathematically valid ✓                      │
│   2. Anyone can confirm proof matches on-chain commitment ✓                 │
│   3. NO ONE can extract 16 bytes without wallet key ✗                       │
│                                                                              │
│   STORAGE:                                                                   │
│   • Primary: Cloudflare R2 (enterprise reliability)                         │
│   • Backup: IPFS (decentralized resilience)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Multi-Provider Storage Architecture

### The Hybrid Multi-Cloud Design

BlockDrive strategically distributes data across providers based on criticality:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-PROVIDER STORAGE STRATEGY                           │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TIER 1: BULK ENCRYPTED DATA                                         │   │
│   │  Location: Filebase / IPFS                                           │   │
│   │                                                                      │   │
│   │  • Encrypted file chunks (MINUS 16 bytes)                           │   │
│   │  • Distributed across decentralized network                         │   │
│   │  • Content-addressed (CID)                                           │   │
│   │  • Censorship-resistant                                              │   │
│   │                                                                      │   │
│   │  Security: COMPLETELY USELESS without the 16 bytes                  │   │
│   │  Even on centralized storage, privacy is maintained                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TIER 2: CRITICAL RECOVERY DATA                                      │   │
│   │  Location: Cloudflare R2 (Primary) + IPFS (Backup)                  │   │
│   │                                                                      │   │
│   │  • Zero-knowledge proofs                                             │   │
│   │  • Encrypted 16 bytes (embedded in proofs)                          │   │
│   │  • 99.99% SLA (R2)                                                   │   │
│   │                                                                      │   │
│   │  Security: Encrypted with wallet-derived key                        │   │
│   │  Useless without wallet signature                                   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  TIER 3: VERIFICATION LAYER                                          │   │
│   │  Location: Solana Blockchain                                         │   │
│   │                                                                      │   │
│   │  • Commitment hashes (SHA-256 of 16 bytes)                          │   │
│   │  • Encrypted metadata CIDs                                           │   │
│   │  • File status (active/deleted)                                      │   │
│   │  • Immutable audit trail                                             │   │
│   │                                                                      │   │
│   │  Security: One-way hash, cannot reverse to obtain 16 bytes          │   │
│   │  Immutable, publicly verifiable                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   TIER 4: PERMANENT ARCHIVAL (Optional)                                     │
│   Location: Arweave                                                          │
│   • 200+ year data persistence guarantee                                    │
│   • One-time payment model                                                   │
│   • For critical/legal documents requiring permanence                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why This Hybrid Approach Works

| Concern | How BlockDrive Addresses It |
|---------|----------------------------|
| **"R2 is centralized, Cloudflare could access data"** | They only have encrypted 16 bytes + proofs. Useless without wallet. |
| **"IPFS nodes could collude"** | They only have incomplete files. Missing 16 bytes = garbage. |
| **"Solana could be compromised"** | Only commitment hashes exist on-chain. One-way, irreversible. |
| **"What if all three are breached?"** | Still useless. Wallet key never leaves user device. |

---

## 4. Blockchain Architecture (Solana)

### Why Solana

| Requirement | Solana Capability |
|-------------|-------------------|
| Speed | ~400ms finality (user expects instant) |
| Cost | ~$0.001 per transaction (economically sustainable) |
| Scalability | 65,000 TPS theoretical (no bottleneck) |
| Ecosystem | Mature wallets, DEXs, institutional adoption |

### Program Derived Addresses (PDAs)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PDA ARCHITECTURE                                      │
│                                                                              │
│   USER WALLET ADDRESS                                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  E.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                    Deterministic derivation                                  │
│                    (always same result for same input)                      │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      USER VAULT MASTER PDA                           │   │
│   │  Seeds: ["vault_master", user_pubkey]                               │   │
│   │                                                                      │   │
│   │  Contains:                                                           │   │
│   │  • Authority (owner wallet)                                          │   │
│   │  • Total file count                                                  │   │
│   │  • Storage used (bytes)                                              │   │
│   │  • Pointers to shard PDAs                                           │   │
│   │  • Creation timestamp                                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│              ┌─────────────────────┼─────────────────────┐                  │
│              ▼                     ▼                     ▼                  │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│   │ SHARD 0 PDA      │  │ SHARD 1 PDA      │  │ SHARD N PDA      │        │
│   │ (100 files max)  │  │ (100 files max)  │  │ (100 files max)  │        │
│   │                  │  │                  │  │                  │        │
│   │ FileRecord[]     │  │ FileRecord[]     │  │ FileRecord[]     │        │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      USER VAULT INDEX PDA                            │   │
│   │  Seeds: ["vault_index", user_pubkey]                                │   │
│   │                                                                      │   │
│   │  • O(1) lookup: file_id → (shard_index, slot_index)                 │   │
│   │  • Enables efficient queries without scanning all shards            │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   CAPACITY: 255 shards × 100 files = 25,500 files per user                 │
│   RECOVERY: Given wallet, PDA is always mathematically derivable           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### FileRecord Structure

Each file is represented on-chain as:

| Field | Type | Description |
|-------|------|-------------|
| `file_id` | bytes32 | Hash of content + timestamp |
| `ipfs_cid` | string | Location of incomplete encrypted file |
| `commitment` | bytes32 | SHA-256 of critical 16 bytes |
| `proof_hash` | bytes32 | Hash of ZK proof |
| `metadata_cid` | string | Encrypted filename, size, type |
| `security_level` | u8 | 1, 2, or 3 |
| `status` | enum | Active, Deleted, Archived |
| `created_at` | i64 | Unix timestamp |
| `updated_at` | i64 | Unix timestamp |

---

## 5. Gasless Operations

### Session Delegation System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GASLESS OPERATION FLOW                                  │
│                                                                              │
│   USER                           RELAYER                        SOLANA      │
│     │                               │                              │         │
│     │  1. Sign delegation message   │                              │         │
│     │  "Delegate to relayer X       │                              │         │
│     │   for operations Y            │                              │         │
│     │   until time Z"               │                              │         │
│     │ ─────────────────────────────▶│                              │         │
│     │                               │                              │         │
│     │                               │  2. Register delegation      │         │
│     │                               │ ─────────────────────────────▶│         │
│     │                               │     (relayer pays gas)       │         │
│     │                               │                              │         │
│     │  3. Sign operation message    │                              │         │
│     │  "Upload file X with params"  │                              │         │
│     │ ─────────────────────────────▶│                              │         │
│     │                               │                              │         │
│     │                               │  4. Execute on behalf of user│         │
│     │                               │ ─────────────────────────────▶│         │
│     │                               │     (relayer pays gas)       │         │
│     │                               │                              │         │
│     │                               │  5. Operation recorded       │         │
│     │◀──────────────────────────────│◀──────────────────────────────│         │
│     │       Confirmation            │                              │         │
│                                                                              │
│   USER PAYS: $0 gas                                                          │
│   USER SIGNS: Messages only (not transactions)                              │
│   RELAYER PAYS: ~$0.001 per operation (from subscription revenue)           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Delegation Security

| Protection | Implementation |
|------------|----------------|
| **Time-bounded** | Delegations expire (default 24 hours) |
| **Permission-scoped** | Relayer can only perform specified operations |
| **Anti-replay** | Nonce prevents message reuse |
| **Revocable** | User can revoke delegation at any time |
| **Least privilege** | Delete/transfer operations not delegatable |

---

## 6. True Deletion

### Why True Deletion Matters

Traditional storage cannot guarantee deletion:
- Backups persist
- Caches exist
- Distributed copies linger
- "Deleted" often means "marked as deleted"

### BlockDrive's True Deletion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRUE DELETION FLOW                                   │
│                                                                              │
│   BEFORE DELETION:                                                           │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│   │ Incomplete file │  │ ZK Proof +      │  │ Solana: Valid           │    │
│   │ on IPFS/Filebase│  │ 16 bytes on R2  │  │ commitment hash         │    │
│   └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│          ▲                    ▲                        ▲                    │
│          │                    │                        │                    │
│          └────────────────────┴────────────────────────┘                    │
│                    All three required for reconstruction                    │
│                                                                              │
│   DELETION PROCESS:                                                          │
│   1. User signs delete request                                               │
│   2. On-chain commitment OVERWRITTEN with random bytes                      │
│   3. FileRecord status changed to "Deleted"                                  │
│                                                                              │
│   AFTER DELETION:                                                            │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐    │
│   │ Incomplete file │  │ ZK Proof +      │  │ Solana: INVALID         │    │
│   │ STILL EXISTS    │  │ 16 bytes        │  │ commitment (random)     │    │
│   │ but USELESS     │  │ STILL EXISTS    │  │                         │    │
│   └─────────────────┘  └─────────────────┘  └─────────────────────────┘    │
│          ▲                    ▲                        ▲                    │
│          │                    │                        │                    │
│          └────────────────────┴──────────── X ─────────┘                    │
│                    Verification chain BROKEN                                │
│                    File is PERMANENTLY IRRECONSTRUCTIBLE                    │
│                                                                              │
│   KEY INSIGHT:                                                               │
│   We don't need to delete the distributed file chunks.                      │
│   By invalidating the commitment, reconstruction becomes impossible.        │
│   This is TRUE deletion—not hiding, not marking, but mathematical           │
│   impossibility of reconstruction.                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Open Source Recovery SDK

### Eliminating Vendor Lock-in

BlockDrive provides a fully open-source Python SDK:

```python
# recovery_sdk.py (simplified)

class BlockDriveRecovery:
    def __init__(self, wallet_private_key):
        self.wallet = Wallet(wallet_private_key)
    
    def derive_keys(self):
        """Regenerate encryption keys from wallet signatures"""
        sig1 = self.wallet.sign("BlockDrive Security Level One")
        sig2 = self.wallet.sign("BlockDrive Security Level Two")
        sig3 = self.wallet.sign("BlockDrive Security Level Three")
        return [kdf(sig) for sig in [sig1, sig2, sig3]]
    
    def recover_file(self, file_id):
        """Recover file using only wallet and public blockchain"""
        # 1. Read UserVault PDA from Solana
        vault = self.read_pda(self.wallet.pubkey)
        file_record = vault.find_file(file_id)
        
        # 2. Download incomplete file from IPFS
        incomplete_file = ipfs.get(file_record.ipfs_cid)
        
        # 3. Download ZK proof from R2/IPFS
        proof = storage.get(file_record.proof_cid)
        
        # 4. Verify proof against on-chain commitment
        assert verify_zk_proof(proof, file_record.commitment)
        
        # 5. Extract 16 bytes from proof using wallet key
        key = self.derive_keys()[file_record.security_level]
        critical_bytes = decrypt(proof.encrypted_bytes, key)
        
        # 6. Verify extracted bytes match commitment
        assert sha256(critical_bytes) == file_record.commitment
        
        # 7. Reconstruct complete encrypted file
        complete_encrypted = critical_bytes + incomplete_file
        
        # 8. Decrypt with wallet-derived key
        return decrypt(complete_encrypted, key)
```

**Guarantee:** Even if BlockDrive ceases to exist, users can recover all files using only their wallet and this open-source script.

---

## 8. Payment Infrastructure

### Unified Payment System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAYMENT ARCHITECTURE                                   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         FIAT PATH                                    │   │
│   │  User → Stripe Checkout → Webhook → Mint NFT Membership             │   │
│   │         (Visa/MC/Amex)     ↓         + Allocate Gas Credits         │   │
│   │                       Supabase                                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        CRYPTO PATH                                   │   │
│   │  User → Crossmint/Radom → Confirmation → Mint NFT Membership        │   │
│   │         (SOL/USDC/etc)       ↓            + Allocate Gas Credits    │   │
│   │                          Supabase                                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   NFT MEMBERSHIP:                                                            │
│   • SPL token on Solana                                                     │
│   • Contains: tier, expiry, features, storage quota                         │
│   • Immutable proof of subscription                                          │
│   • Transferable (optional)                                                  │
│   • User truly owns their membership                                        │
│                                                                              │
│   GAS CREDITS:                                                               │
│   • Held in USDC (stable)                                                   │
│   • Swapped to SOL at time of use                                           │
│   • Covers user's blockchain operations                                     │
│   • User never sees or pays gas                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Summary

### Attack Scenarios

| Attack Vector | Outcome |
|---------------|---------|
| **Filebase/IPFS node compromise** | Attacker gets incomplete encrypted chunks (garbage) |
| **Cloudflare R2 breach** | Attacker gets encrypted proofs (useless without wallet) |
| **Solana chain compromise** | Attacker gets commitment hashes (one-way, irreversible) |
| **All storage providers simultaneously** | Still garbage—wallet key never transmitted |
| **BlockDrive company compromise** | Cannot access user files—keys are wallet-derived |
| **Government subpoena to BlockDrive** | Cannot comply—we don't have keys or complete files |
| **Rogue employee** | Cannot access files—no centralized key store |

### What Makes This Different

| Traditional "Zero-Knowledge" | BlockDrive Programmed Incompleteness |
|-----------------------------|--------------------------------------|
| Complete encrypted files exist | Complete files NEVER exist |
| Key compromise = total exposure | Key compromise = still need 3 systems |
| Trust the provider's claims | Trust mathematics |
| "We can't read your files" (promise) | "No one CAN read your files" (architecture) |

---

## 10. Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React, TypeScript | Web application |
| **Backend** | Supabase Edge Functions | Serverless API |
| **Database** | Supabase PostgreSQL | User data, sync |
| **Blockchain** | Solana (Anchor) | Commitments, PDAs |
| **Primary Storage** | Filebase/IPFS | Encrypted chunks |
| **Reliability Storage** | Cloudflare R2 | Proofs, critical data |
| **Permanence** | Arweave | Optional archival |
| **Auth** | Clerk + Wallet | Hybrid identity |
| **Payments** | Stripe + Crossmint | Fiat + crypto |

---

## Conclusion

BlockDrive's Programmed Incompleteness is not an incremental improvement to encryption. It's a fundamental reimagining of data security architecture.

**The key insight:** Instead of protecting complete files, ensure complete files never exist.

This creates the first storage platform where breached data is worthless—not through better locks, but by ensuring there's nothing complete at any single point. Breaches can happen, but what attackers find is incomplete, useless data. Arweave provides permanent redundancy for data recovery.

**Enterprise cloud storage for the new internet.**
