---
name: Solana Smart Contract Wallets
description: This skill should be used when the user asks about "Solana smart wallets", "Squads Protocol", "multi-signature wallets", "programmable security", "automated custody", "gas sponsorship for Solana", "enterprise wallet management", "multisig on Solana", or needs to implement secure, programmable smart contract wallets with Crossmint and Squads Protocol for enterprise-grade custody and automated operations.
version: 1.0.0
---

# Solana Smart Contract Wallets with Squads Protocol

## Overview

Smart contract wallets on Solana provide programmable security, multi-signature custody, and automated operations that go far beyond traditional externally owned accounts (EOAs). By integrating Crossmint's embedded wallet infrastructure with Squads Protocol, BlockDrive can offer enterprise-grade wallet management with features like:

- **Multi-Signature Custody**: Require multiple approvals for high-value transactions
- **Programmable Security**: Define spending limits, time locks, and automated rules
- **Gas Sponsorship**: Pay transaction fees for users through Crossmint
- **Role-Based Access**: Different permission levels for team members
- **Automated Operations**: Schedule recurring payments, automatic NFT distributions
- **Recovery Mechanisms**: Social recovery without seed phrases
- **Transaction Batching**: Execute multiple operations atomically

**Why Squads Protocol?**

Squads is the leading multisig and smart wallet infrastructure on Solana, used by major projects like Jupiter, Marinade, and Orca. It provides:
- Battle-tested security with $2B+ in assets secured
- Flexible approval policies (N-of-M signatures)
- Program execution support (not just token transfers)
- Time-delayed transactions for added security
- Sub-accounts for organizational hierarchies

## When to Use

Activate this skill when:
- Implementing enterprise-grade wallet custody for BlockDrive
- Setting up multi-signature wallets for DAO treasuries
- Creating automated payment systems for subscriptions
- Building team wallets with role-based permissions
- Implementing gas sponsorship for seamless UX
- Designing recovery mechanisms for user wallets
- Creating vault systems for high-value NFT storage
- Setting up automated NFT minting with spending limits
- Implementing compliance controls (spending limits, whitelists)

## Core Architecture

### Smart Wallet Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│           CROSSMINT + SQUADS SMART WALLET ARCHITECTURE              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐       │
│  │   CROSSMINT  │────▶│    SQUADS    │────▶│   SOLANA     │       │
│  │ Embedded SDK │     │   Protocol   │     │  Blockchain  │       │
│  └──────────────┘     └──────────────┘     └──────────────┘       │
│         │                    │                     │               │
│         │                    │                     │               │
│    User Wallets         Smart Wallet          On-Chain State       │
│    (MPC Signers)        (Multisig)            (Programs)           │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SMART WALLET CAPABILITIES                                   │  │
│  │  • Multi-sig approvals (2-of-3, 3-of-5, etc.)               │  │
│  │  • Programmable spending limits                              │  │
│  │  • Time-locked transactions                                  │  │
│  │  • Automated recurring operations                            │  │
│  │  • Role-based access control                                 │  │
│  │  • Social recovery mechanisms                                │  │
│  │  • Transaction batching                                      │  │
│  │  • Gas sponsorship integration                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Signature Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MULTISIG TRANSACTION FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Step 1: Transaction Creation                                       │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  User A (Proposer)                                     │        │
│  │  ├─ Creates transaction proposal                       │        │
│  │  ├─ Defines operations (transfer, mint, etc.)          │        │
│  │  └─ Signs with Crossmint embedded wallet               │        │
│  └────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Step 2: Approval Collection                                        │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  User B (Approver)                                     │        │
│  │  ├─ Reviews transaction details                        │        │
│  │  ├─ Verifies on-chain state                            │        │
│  │  └─ Signs approval with embedded wallet                │        │
│  └────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Step 3: Threshold Check                                            │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  Squads Protocol                                       │        │
│  │  ├─ Counts approvals (2 of 3 reached)                 │        │
│  │  ├─ Validates signature authenticity                   │        │
│  │  └─ Enables execution when threshold met               │        │
│  └────────────────────────────────────────────────────────┘        │
│                          ↓                                          │
│  Step 4: Execution                                                  │
│  ┌────────────────────────────────────────────────────────┐        │
│  │  Any User (Executor)                                   │        │
│  │  ├─ Submits execute transaction                        │        │
│  │  ├─ Squads verifies all signatures                     │        │
│  │  └─ Operations executed atomically                     │        │
│  └────────────────────────────────────────────────────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Gas Sponsorship Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GAS SPONSORSHIP SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐         ┌────────────────┐                     │
│  │  USER WALLET   │         │  SPONSOR PAYER │                     │
│  │  (No SOL)      │         │  (BlockDrive)  │                     │
│  └────────────────┘         └────────────────┘                     │
│         │                           │                               │
│         │  1. Sign transaction      │                               │
│         │     (no fee required)     │                               │
│         │                           │                               │
│         ▼                           ▼                               │
│  ┌─────────────────────────────────────────┐                       │
│  │    CROSSMINT GAS ABSTRACTION            │                       │
│  │  • User signs with embedded wallet      │                       │
│  │  • Crossmint adds sponsor signature     │                       │
│  │  • Transaction submitted to Solana      │                       │
│  │  • Fees deducted from sponsor account   │                       │
│  └─────────────────────────────────────────┘                       │
│                    ↓                                                │
│         ┌──────────────────────┐                                   │
│         │   SOLANA BLOCKCHAIN  │                                   │
│         │  Transaction Success │                                   │
│         └──────────────────────┘                                   │
│                                                                      │
│  COST CONTROL MECHANISMS:                                           │
│  ├─ Rate limiting per user                                          │
│  ├─ Spending caps per operation                                     │
│  ├─ Whitelist approved programs                                     │
│  └─ Analytics dashboard for cost tracking                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Pattern

### Required Packages

```bash
npm install @crossmint/client-sdk-react-ui
npm install @sqds/sdk
npm install @solana/web3.js
npm install @solana/spl-token
npm install bs58
```

### Environment Configuration

```typescript
// .env.local
NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY=your_client_key
CROSSMINT_SERVER_API_KEY=your_server_key
SQUADS_MULTISIG_PROGRAM_ID=SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf
SOLANA_RPC_URL=https://api.devnet.solana.com
GAS_SPONSOR_PRIVATE_KEY=your_sponsor_wallet_key
```

### Core Smart Wallet Service

```typescript
// lib/smart-wallets/squads-service.ts
import { Multisig, Permissions } from '@sqds/sdk';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { CrossmintEmbeddedWallet } from '@crossmint/client-sdk-react-ui';

export interface SmartWalletConfig {
  threshold: number;
  members: PublicKey[];
  permissions?: Map<string, Permissions>;
  timeLock?: number; // seconds
}

export interface TransactionProposal {
  id: string;
  multisigAddress: string;
  transactionIndex: number;
  proposer: string;
  operations: Operation[];
  approvals: string[];
  executed: boolean;
  createdAt: Date;
}

export interface Operation {
  type: 'transfer' | 'mint_nft' | 'program_execution';
  data: any;
}

export class SquadsSmartWalletService {
  private connection: Connection;
  private multisig: Multisig;
  private crossmintWallet: CrossmintEmbeddedWallet;

  constructor(
    rpcUrl: string,
    crossmintWallet: CrossmintEmbeddedWallet
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.crossmintWallet = crossmintWallet;
  }

  /**
   * Create a new smart wallet with multi-signature capabilities
   */
  async createSmartWallet(
    config: SmartWalletConfig
  ): Promise<{ multisigAddress: PublicKey; vaultAddress: PublicKey }> {
    try {
      // Get the Crossmint wallet signer
      const creator = await this.getCrossmintSigner();

      // Create multisig account
      const createKey = PublicKey.unique();
      const multisigPda = this.multisig.getMultisigPda({
        createKey,
      })[0];

      // Build create transaction
      const { instruction } = await this.multisig.methods
        .multisigCreate({
          creator,
          multisigPda,
          configAuthority: creator,
          threshold: config.threshold,
          members: config.members.map(member => ({
            key: member,
            permissions: Permissions.all(),
          })),
          timeLock: config.timeLock || 0,
        })
        .build();

      // Sign and send with gas sponsorship
      const tx = new Transaction().add(instruction);
      const signature = await this.sendWithGasSponsorship(tx);

      // Derive vault address
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('multisig'), multisigPda.toBuffer(), Buffer.from('vault'), Buffer.from([0])],
        this.multisig.programId
      );

      console.log('Smart wallet created:', {
        multisig: multisigPda.toBase58(),
        vault: vaultPda.toBase58(),
        signature,
      });

      return {
        multisigAddress: multisigPda,
        vaultAddress: vaultPda,
      };
    } catch (error) {
      console.error('Failed to create smart wallet:', error);
      throw error;
    }
  }

  /**
   * Propose a transaction that requires multi-sig approval
   */
  async proposeTransaction(
    multisigAddress: PublicKey,
    operations: Operation[]
  ): Promise<TransactionProposal> {
    try {
      const proposer = await this.getCrossmintSigner();

      // Get current transaction index
      const multisigInfo = await this.multisig.accounts.multisig(multisigAddress);
      const transactionIndex = multisigInfo.transactionIndex + 1;

      // Create proposal transaction
      const { instruction } = await this.multisig.methods
        .proposalCreate({
          multisigPda: multisigAddress,
          transactionIndex,
          creator: proposer,
        })
        .build();

      // Add operations to proposal
      const operationInstructions = await this.buildOperations(
        multisigAddress,
        operations
      );

      const tx = new Transaction().add(instruction, ...operationInstructions);
      const signature = await this.sendWithGasSponsorship(tx);

      const proposal: TransactionProposal = {
        id: signature,
        multisigAddress: multisigAddress.toBase58(),
        transactionIndex,
        proposer: proposer.toBase58(),
        operations,
        approvals: [proposer.toBase58()], // Proposer auto-approves
        executed: false,
        createdAt: new Date(),
      };

      console.log('Transaction proposed:', proposal);
      return proposal;
    } catch (error) {
      console.error('Failed to propose transaction:', error);
      throw error;
    }
  }

  /**
   * Approve a pending transaction proposal
   */
  async approveTransaction(
    multisigAddress: PublicKey,
    transactionIndex: number
  ): Promise<string> {
    try {
      const approver = await this.getCrossmintSigner();

      const { instruction } = await this.multisig.methods
        .proposalApprove({
          multisigPda: multisigAddress,
          transactionIndex,
          member: approver,
        })
        .build();

      const tx = new Transaction().add(instruction);
      const signature = await this.sendWithGasSponsorship(tx);

      console.log('Transaction approved:', {
        multisig: multisigAddress.toBase58(),
        transactionIndex,
        approver: approver.toBase58(),
        signature,
      });

      return signature;
    } catch (error) {
      console.error('Failed to approve transaction:', error);
      throw error;
    }
  }

  /**
   * Execute an approved transaction
   */
  async executeTransaction(
    multisigAddress: PublicKey,
    transactionIndex: number
  ): Promise<string> {
    try {
      const executor = await this.getCrossmintSigner();

      // Check if threshold is met
      const proposalInfo = await this.multisig.accounts.proposal(
        multisigAddress,
        transactionIndex
      );

      if (proposalInfo.approved.length < proposalInfo.threshold) {
        throw new Error(
          `Insufficient approvals: ${proposalInfo.approved.length}/${proposalInfo.threshold}`
        );
      }

      const { instruction } = await this.multisig.methods
        .vaultTransactionExecute({
          multisigPda: multisigAddress,
          transactionIndex,
          member: executor,
        })
        .build();

      const tx = new Transaction().add(instruction);
      const signature = await this.sendWithGasSponsorship(tx);

      console.log('Transaction executed:', {
        multisig: multisigAddress.toBase58(),
        transactionIndex,
        signature,
      });

      return signature;
    } catch (error) {
      console.error('Failed to execute transaction:', error);
      throw error;
    }
  }

  /**
   * Get smart wallet details and status
   */
  async getSmartWalletInfo(multisigAddress: PublicKey) {
    try {
      const multisigInfo = await this.multisig.accounts.multisig(multisigAddress);

      return {
        address: multisigAddress.toBase58(),
        threshold: multisigInfo.threshold,
        members: multisigInfo.members.map((m: any) => ({
          address: m.key.toBase58(),
          permissions: m.permissions,
        })),
        transactionIndex: multisigInfo.transactionIndex,
        timeLock: multisigInfo.timeLock,
        configAuthority: multisigInfo.configAuthority.toBase58(),
      };
    } catch (error) {
      console.error('Failed to fetch smart wallet info:', error);
      throw error;
    }
  }

  /**
   * List pending proposals for a smart wallet
   */
  async getPendingProposals(
    multisigAddress: PublicKey
  ): Promise<TransactionProposal[]> {
    try {
      const proposals = await this.multisig.getProposals({
        multisigPda: multisigAddress,
      });

      return proposals
        .filter((p: any) => p.status === 'active')
        .map((p: any) => ({
          id: p.publicKey.toBase58(),
          multisigAddress: multisigAddress.toBase58(),
          transactionIndex: p.transactionIndex,
          proposer: p.creator.toBase58(),
          operations: p.transactions,
          approvals: p.approved.map((a: any) => a.toBase58()),
          executed: p.status === 'executed',
          createdAt: new Date(p.createdAt * 1000),
        }));
    } catch (error) {
      console.error('Failed to fetch pending proposals:', error);
      throw error;
    }
  }

  /**
   * Send transaction with gas sponsorship
   */
  private async sendWithGasSponsorship(tx: Transaction): Promise<string> {
    try {
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;

      // Sign with Crossmint embedded wallet
      const userSignature = await this.crossmintWallet.signTransaction(tx);

      // Add sponsor signature (server-side)
      const sponsoredTx = await this.addSponsorSignature(userSignature);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        sponsoredTx.serialize()
      );

      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return signature;
    } catch (error) {
      console.error('Failed to send sponsored transaction:', error);
      throw error;
    }
  }

  /**
   * Get Crossmint wallet as signer
   */
  private async getCrossmintSigner(): Promise<PublicKey> {
    const address = await this.crossmintWallet.getAddress('solana');
    return new PublicKey(address);
  }

  /**
   * Build operation instructions
   */
  private async buildOperations(
    multisigAddress: PublicKey,
    operations: Operation[]
  ): Promise<any[]> {
    // Implementation for building various operation types
    // This would include token transfers, NFT minting, etc.
    return [];
  }

  /**
   * Add sponsor signature (server-side)
   */
  private async addSponsorSignature(tx: Transaction): Promise<Transaction> {
    // This would be called via API route that has access to sponsor key
    // For now, return unsigned transaction
    return tx;
  }
}
```

### Gas Sponsorship Implementation

```typescript
// lib/smart-wallets/gas-sponsor.ts
import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

export interface SponsorshipConfig {
  maxFeePerTx: number; // lamports
  dailyLimit: number; // lamports
  allowedPrograms: PublicKey[];
  rateLimitPerUser: number; // tx per hour
}

export interface SponsorshipStats {
  totalSponsored: number;
  transactionsSponsored: number;
  costToday: number;
  topUsers: { user: string; txCount: number }[];
}

export class GasSponsorService {
  private connection: Connection;
  private sponsorKeypair: Keypair;
  private config: SponsorshipConfig;
  private usageTracker: Map<string, { count: number; lastReset: Date }>;

  constructor(
    rpcUrl: string,
    sponsorPrivateKey: string,
    config: SponsorshipConfig
  ) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.sponsorKeypair = Keypair.fromSecretKey(
      bs58.decode(sponsorPrivateKey)
    );
    this.config = config;
    this.usageTracker = new Map();
  }

  /**
   * Sponsor a transaction for a user
   */
  async sponsorTransaction(
    userTransaction: Transaction,
    userAddress: string
  ): Promise<Transaction> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(userAddress)) {
        throw new Error('Rate limit exceeded for user');
      }

      // Validate transaction
      this.validateTransaction(userTransaction);

      // Estimate fee
      const estimatedFee = await this.estimateFee(userTransaction);
      if (estimatedFee > this.config.maxFeePerTx) {
        throw new Error(`Transaction fee ${estimatedFee} exceeds max ${this.config.maxFeePerTx}`);
      }

      // Check daily limit
      const costToday = await this.getCostToday();
      if (costToday + estimatedFee > this.config.dailyLimit) {
        throw new Error('Daily sponsorship limit reached');
      }

      // Add sponsor as fee payer
      userTransaction.feePayer = this.sponsorKeypair.publicKey;

      // Sign transaction with sponsor key
      userTransaction.partialSign(this.sponsorKeypair);

      // Track usage
      this.trackUsage(userAddress, estimatedFee);

      console.log('Transaction sponsored:', {
        user: userAddress,
        fee: estimatedFee,
        signature: userTransaction.signature?.toString(),
      });

      return userTransaction;
    } catch (error) {
      console.error('Failed to sponsor transaction:', error);
      throw error;
    }
  }

  /**
   * Check if user is within rate limits
   */
  private checkRateLimit(userAddress: string): boolean {
    const usage = this.usageTracker.get(userAddress);
    const now = new Date();

    if (!usage) {
      this.usageTracker.set(userAddress, { count: 0, lastReset: now });
      return true;
    }

    // Reset if hour has passed
    const hoursPassed = (now.getTime() - usage.lastReset.getTime()) / (1000 * 60 * 60);
    if (hoursPassed >= 1) {
      this.usageTracker.set(userAddress, { count: 0, lastReset: now });
      return true;
    }

    return usage.count < this.config.rateLimitPerUser;
  }

  /**
   * Validate transaction against allowed programs
   */
  private validateTransaction(tx: Transaction): void {
    for (const instruction of tx.instructions) {
      const programId = instruction.programId.toBase58();
      const isAllowed = this.config.allowedPrograms.some(
        allowed => allowed.toBase58() === programId
      );

      if (!isAllowed) {
        throw new Error(`Program ${programId} not in allowlist`);
      }
    }
  }

  /**
   * Estimate transaction fee
   */
  private async estimateFee(tx: Transaction): Promise<number> {
    const message = tx.compileMessage();
    const fee = await this.connection.getFeeForMessage(message);
    return fee.value || 5000; // Default to 5000 lamports
  }

  /**
   * Track sponsorship usage
   */
  private trackUsage(userAddress: string, fee: number): void {
    const usage = this.usageTracker.get(userAddress);
    if (usage) {
      usage.count += 1;
      this.usageTracker.set(userAddress, usage);
    }

    // Store in database for analytics
    this.recordSponsorshipEvent(userAddress, fee);
  }

  /**
   * Get sponsorship statistics
   */
  async getStats(): Promise<SponsorshipStats> {
    // Fetch from database
    // This is a placeholder implementation
    return {
      totalSponsored: 0,
      transactionsSponsored: 0,
      costToday: 0,
      topUsers: [],
    };
  }

  /**
   * Get cost for current day
   */
  private async getCostToday(): Promise<number> {
    // Query database for today's total cost
    return 0;
  }

  /**
   * Record sponsorship event in database
   */
  private async recordSponsorshipEvent(
    userAddress: string,
    fee: number
  ): Promise<void> {
    // Store in Supabase or other database
    console.log('Recording sponsorship:', { userAddress, fee });
  }
}
```

### React Hook for Smart Wallets

```typescript
// hooks/useSmartWallet.ts
import { useState, useCallback, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCrossmintEmbeddedWallet } from './useCrossmintEmbeddedWallet';
import { SquadsSmartWalletService, TransactionProposal, Operation } from '@/lib/smart-wallets/squads-service';

export function useSmartWallet(multisigAddress?: string) {
  const { wallet, isReady } = useCrossmintEmbeddedWallet();
  const [service, setService] = useState<SquadsSmartWalletService | null>(null);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [pendingProposals, setPendingProposals] = useState<TransactionProposal[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize service
  useEffect(() => {
    if (wallet && isReady) {
      const svc = new SquadsSmartWalletService(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
        wallet
      );
      setService(svc);
    }
  }, [wallet, isReady]);

  // Load wallet info
  useEffect(() => {
    if (service && multisigAddress) {
      loadWalletInfo();
      loadPendingProposals();
    }
  }, [service, multisigAddress]);

  const loadWalletInfo = useCallback(async () => {
    if (!service || !multisigAddress) return;

    try {
      const info = await service.getSmartWalletInfo(new PublicKey(multisigAddress));
      setWalletInfo(info);
    } catch (error) {
      console.error('Failed to load wallet info:', error);
    }
  }, [service, multisigAddress]);

  const loadPendingProposals = useCallback(async () => {
    if (!service || !multisigAddress) return;

    try {
      const proposals = await service.getPendingProposals(
        new PublicKey(multisigAddress)
      );
      setPendingProposals(proposals);
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  }, [service, multisigAddress]);

  const createSmartWallet = useCallback(
    async (threshold: number, members: string[]) => {
      if (!service) throw new Error('Service not initialized');

      setLoading(true);
      try {
        const memberPubkeys = members.map(m => new PublicKey(m));
        const result = await service.createSmartWallet({
          threshold,
          members: memberPubkeys,
        });
        return result;
      } finally {
        setLoading(false);
      }
    },
    [service]
  );

  const proposeTransaction = useCallback(
    async (operations: Operation[]) => {
      if (!service || !multisigAddress) {
        throw new Error('Service or multisig not initialized');
      }

      setLoading(true);
      try {
        const proposal = await service.proposeTransaction(
          new PublicKey(multisigAddress),
          operations
        );
        await loadPendingProposals();
        return proposal;
      } finally {
        setLoading(false);
      }
    },
    [service, multisigAddress, loadPendingProposals]
  );

  const approveTransaction = useCallback(
    async (transactionIndex: number) => {
      if (!service || !multisigAddress) {
        throw new Error('Service or multisig not initialized');
      }

      setLoading(true);
      try {
        const signature = await service.approveTransaction(
          new PublicKey(multisigAddress),
          transactionIndex
        );
        await loadPendingProposals();
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [service, multisigAddress, loadPendingProposals]
  );

  const executeTransaction = useCallback(
    async (transactionIndex: number) => {
      if (!service || !multisigAddress) {
        throw new Error('Service or multisig not initialized');
      }

      setLoading(true);
      try {
        const signature = await service.executeTransaction(
          new PublicKey(multisigAddress),
          transactionIndex
        );
        await loadPendingProposals();
        await loadWalletInfo();
        return signature;
      } finally {
        setLoading(false);
      }
    },
    [service, multisigAddress, loadPendingProposals, loadWalletInfo]
  );

  return {
    walletInfo,
    pendingProposals,
    loading,
    createSmartWallet,
    proposeTransaction,
    approveTransaction,
    executeTransaction,
    refresh: () => {
      loadWalletInfo();
      loadPendingProposals();
    },
  };
}
```

### Smart Wallet UI Component

```typescript
// components/smart-wallet/SmartWalletDashboard.tsx
'use client';

import { useState } from 'react';
import { useSmartWallet } from '@/hooks/useSmartWallet';
import { Operation } from '@/lib/smart-wallets/squads-service';

interface SmartWalletDashboardProps {
  multisigAddress: string;
}

export function SmartWalletDashboard({ multisigAddress }: SmartWalletDashboardProps) {
  const {
    walletInfo,
    pendingProposals,
    loading,
    proposeTransaction,
    approveTransaction,
    executeTransaction,
  } = useSmartWallet(multisigAddress);

  const [showCreateProposal, setShowCreateProposal] = useState(false);

  if (!walletInfo) {
    return <div>Loading wallet info...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Wallet Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Smart Wallet</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Address</p>
            <p className="font-mono text-sm">{walletInfo.address}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approval Threshold</p>
            <p className="font-semibold">
              {walletInfo.threshold} of {walletInfo.members.length}
            </p>
          </div>
        </div>

        {/* Members */}
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Members</h3>
          <div className="space-y-2">
            {walletInfo.members.map((member: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="font-mono text-sm">{member.address}</span>
                <span className="text-xs text-gray-600">
                  {Object.keys(member.permissions).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Proposals */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Pending Proposals</h2>
          <button
            onClick={() => setShowCreateProposal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            New Proposal
          </button>
        </div>

        {pendingProposals.length === 0 ? (
          <p className="text-gray-600">No pending proposals</p>
        ) : (
          <div className="space-y-4">
            {pendingProposals.map(proposal => (
              <div key={proposal.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">
                      Transaction #{proposal.transactionIndex}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Proposed by {proposal.proposer.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {proposal.approvals.length} / {walletInfo.threshold} approvals
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(proposal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Operations */}
                <div className="bg-gray-50 rounded p-3 mb-3">
                  <p className="text-sm font-semibold mb-2">Operations:</p>
                  {proposal.operations.map((op, idx) => (
                    <div key={idx} className="text-sm">
                      {op.type}: {JSON.stringify(op.data)}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => approveTransaction(proposal.transactionIndex)}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  {proposal.approvals.length >= walletInfo.threshold && (
                    <button
                      onClick={() => executeTransaction(proposal.transactionIndex)}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Execute
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Proposal Modal */}
      {showCreateProposal && (
        <CreateProposalModal
          onClose={() => setShowCreateProposal(false)}
          onSubmit={async (operations) => {
            await proposeTransaction(operations);
            setShowCreateProposal(false);
          }}
        />
      )}
    </div>
  );
}

interface CreateProposalModalProps {
  onClose: () => void;
  onSubmit: (operations: Operation[]) => Promise<void>;
}

function CreateProposalModal({ onClose, onSubmit }: CreateProposalModalProps) {
  const [operations, setOperations] = useState<Operation[]>([
    { type: 'transfer', data: {} },
  ]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">Create Transaction Proposal</h2>

        {/* Operation builder UI would go here */}
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Build your transaction operations
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSubmit(operations)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Proposal
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

## Enterprise Use Cases

### Use Case 1: DAO Treasury Management

**Scenario**: BlockDrive DAO manages community funds for grants and development.

**Implementation**:
```typescript
// Setup 5-of-9 multisig for DAO treasury
const daoTreasury = await smartWalletService.createSmartWallet({
  threshold: 5,
  members: [
    founderWallet1,
    founderWallet2,
    communityLead1,
    communityLead2,
    technicalLead1,
    technicalLead2,
    advisorWallet1,
    advisorWallet2,
    treasurerWallet,
  ],
  timeLock: 86400, // 24 hour delay for security
});

// Propose grant payment
const grantProposal = await smartWalletService.proposeTransaction(
  daoTreasury.multisigAddress,
  [{
    type: 'transfer',
    data: {
      recipient: grantRecipient,
      amount: 50000 * LAMPORTS_PER_SOL, // 50k SOL
      memo: 'Q1 Development Grant',
    },
  }]
);

// Members vote, then execute after 24 hours
```

**Benefits**:
- No single person can drain treasury
- 24-hour time lock prevents rushed decisions
- All payments are transparent on-chain
- Automated compliance tracking

### Use Case 2: Subscription Payment Automation

**Scenario**: Automatically charge users for Pro tier subscriptions monthly.

**Implementation**:
```typescript
// Create smart wallet for user with automated payment permission
const userSmartWallet = await smartWalletService.createSmartWallet({
  threshold: 1, // User-only control
  members: [userWallet],
  permissions: new Map([
    [blockDriveServiceWallet.toBase58(), Permissions.execute()],
  ]),
});

// Service wallet can execute pre-approved operations
const subscriptionCharge = await smartWalletService.proposeTransaction(
  userSmartWallet.multisigAddress,
  [{
    type: 'transfer',
    data: {
      recipient: blockDriveRevenueWallet,
      amount: 10 * LAMPORTS_PER_SOL, // $10 in SOL
      memo: 'Pro Subscription - January 2026',
    },
  }]
);

// Automatically execute without additional approval
await smartWalletService.executeTransaction(
  userSmartWallet.multisigAddress,
  subscriptionCharge.transactionIndex
);
```

**Benefits**:
- Users pre-approve recurring charges
- Service can't exceed spending limit
- User maintains custody of funds
- Can cancel by revoking permissions

### Use Case 3: Team Wallets with Role-Based Access

**Scenario**: Marketing team needs shared wallet with spending controls.

**Implementation**:
```typescript
// Create team wallet with different permission levels
const marketingWallet = await smartWalletService.createSmartWallet({
  threshold: 2, // 2-of-3 for large purchases
  members: [
    { address: marketingManager, permissions: Permissions.all() },
    { address: contentLead, permissions: Permissions.initiate() },
    { address: socialMediaManager, permissions: Permissions.initiate() },
  ],
});

// Set up spending limit for small purchases
const smallPurchaseLimit = 5 * LAMPORTS_PER_SOL;

// Content lead can propose, but needs manager approval for execution
const contentProposal = await smartWalletService.proposeTransaction(
  marketingWallet.multisigAddress,
  [{
    type: 'transfer',
    data: {
      recipient: contentCreator,
      amount: 2 * LAMPORTS_PER_SOL,
      memo: 'Blog post commission',
    },
  }]
);
```

**Benefits**:
- Managers have full control
- Team members can initiate but not execute alone
- Spending limits prevent unauthorized large purchases
- All transactions auditable

### Use Case 4: NFT Drop with Gas Sponsorship

**Scenario**: Mint 10,000 NFTs to users without them paying gas fees.

**Implementation**:
```typescript
// Configure gas sponsor for NFT minting program
const gasSponsor = new GasSponsorService(
  rpcUrl,
  sponsorPrivateKey,
  {
    maxFeePerTx: 10000, // 0.00001 SOL per mint
    dailyLimit: 10 * LAMPORTS_PER_SOL, // 10 SOL per day
    allowedPrograms: [
      METAPLEX_TOKEN_METADATA_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
    ],
    rateLimitPerUser: 5, // 5 mints per hour per user
  }
);

// User mints NFT without paying gas
const mintTx = await createMintNFTTransaction(userWallet);
const sponsoredTx = await gasSponsor.sponsorTransaction(
  mintTx,
  userWallet.toBase58()
);

// User signs, sponsor pays fees
await sendTransaction(sponsoredTx);
```

**Benefits**:
- Seamless user onboarding
- Rate limiting prevents abuse
- Daily cost caps protect budget
- Only whitelisted programs allowed

## Best Practices

### Security

1. **Multi-Signature Setup**
   - Use at least 3-of-5 for high-value wallets
   - Distribute keys across different security contexts
   - Never store all keys in same location
   - Use hardware wallets for high-value signers

2. **Time Locks**
   - Implement delays for large transactions
   - 24-48 hours for treasury operations
   - Immediate execution for small amounts
   - Emergency override requires higher threshold

3. **Permission Management**
   - Least privilege principle for all members
   - Regular audits of member permissions
   - Revoke permissions immediately when member leaves
   - Use sub-accounts for different operation types

4. **Gas Sponsorship Security**
   - Whitelist only necessary programs
   - Implement rate limiting per user
   - Monitor for unusual patterns
   - Set daily and per-transaction limits
   - Keep sponsor wallet funded but not excessive

### Performance Optimization

1. **Transaction Batching**
   - Group multiple operations in single proposal
   - Reduces number of approvals needed
   - Lower overall transaction costs
   - Atomic execution guarantees

2. **Caching**
   - Cache multisig account info
   - Store pending proposals locally
   - Use WebSocket subscriptions for updates
   - Implement optimistic UI updates

3. **RPC Usage**
   - Use dedicated RPC endpoints for production
   - Implement retry logic with exponential backoff
   - Cache frequently accessed data
   - Use commitment level appropriately (confirmed vs finalized)

### User Experience

1. **Clear Communication**
   - Show approval progress visually
   - Explain why multiple approvals needed
   - Display estimated execution time
   - Notify all members of new proposals

2. **Mobile Support**
   - Make approval interface mobile-friendly
   - Push notifications for pending approvals
   - QR code scanning for proposal details
   - Biometric authentication for signing

3. **Error Handling**
   - Graceful failures with clear messages
   - Retry mechanisms for network issues
   - Transaction simulation before proposal
   - Validation before expensive operations

## Testing

```typescript
// tests/smart-wallets/squads.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SquadsSmartWalletService } from '@/lib/smart-wallets/squads-service';
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

describe('SquadsSmartWalletService', () => {
  let service: SquadsSmartWalletService;
  let member1: Keypair;
  let member2: Keypair;
  let member3: Keypair;

  beforeAll(async () => {
    member1 = Keypair.generate();
    member2 = Keypair.generate();
    member3 = Keypair.generate();

    // Airdrop SOL for testing
    await Promise.all([
      airdrop(member1.publicKey),
      airdrop(member2.publicKey),
      airdrop(member3.publicKey),
    ]);
  });

  it('should create a 2-of-3 multisig wallet', async () => {
    const result = await service.createSmartWallet({
      threshold: 2,
      members: [
        member1.publicKey,
        member2.publicKey,
        member3.publicKey,
      ],
    });

    expect(result.multisigAddress).toBeDefined();
    expect(result.vaultAddress).toBeDefined();

    const info = await service.getSmartWalletInfo(result.multisigAddress);
    expect(info.threshold).toBe(2);
    expect(info.members).toHaveLength(3);
  });

  it('should propose and approve transaction', async () => {
    // Create wallet
    const wallet = await service.createSmartWallet({
      threshold: 2,
      members: [member1.publicKey, member2.publicKey],
    });

    // Propose transaction
    const proposal = await service.proposeTransaction(
      wallet.multisigAddress,
      [{
        type: 'transfer',
        data: {
          recipient: Keypair.generate().publicKey,
          amount: 0.1 * LAMPORTS_PER_SOL,
        },
      }]
    );

    expect(proposal.approvals).toHaveLength(1);

    // Second member approves
    await service.approveTransaction(
      wallet.multisigAddress,
      proposal.transactionIndex
    );

    const proposals = await service.getPendingProposals(wallet.multisigAddress);
    const updated = proposals.find(p => p.id === proposal.id);
    expect(updated?.approvals).toHaveLength(2);
  });

  it('should execute when threshold met', async () => {
    const wallet = await service.createSmartWallet({
      threshold: 2,
      members: [member1.publicKey, member2.publicKey],
    });

    const recipient = Keypair.generate().publicKey;
    const proposal = await service.proposeTransaction(
      wallet.multisigAddress,
      [{
        type: 'transfer',
        data: { recipient, amount: 0.1 * LAMPORTS_PER_SOL },
      }]
    );

    await service.approveTransaction(
      wallet.multisigAddress,
      proposal.transactionIndex
    );

    const signature = await service.executeTransaction(
      wallet.multisigAddress,
      proposal.transactionIndex
    );

    expect(signature).toBeDefined();
  });

  it('should reject execution below threshold', async () => {
    const wallet = await service.createSmartWallet({
      threshold: 3,
      members: [
        member1.publicKey,
        member2.publicKey,
        member3.publicKey,
      ],
    });

    const proposal = await service.proposeTransaction(
      wallet.multisigAddress,
      [{
        type: 'transfer',
        data: {
          recipient: Keypair.generate().publicKey,
          amount: 0.1 * LAMPORTS_PER_SOL,
        },
      }]
    );

    // Only 2 approvals (proposer + 1)
    await service.approveTransaction(
      wallet.multisigAddress,
      proposal.transactionIndex
    );

    // Should fail with insufficient approvals
    await expect(
      service.executeTransaction(
        wallet.multisigAddress,
        proposal.transactionIndex
      )
    ).rejects.toThrow('Insufficient approvals');
  });
});
```

## Troubleshooting

### Common Issues

1. **"Insufficient approvals" error**
   - Verify approval count matches threshold
   - Check all approvers are valid members
   - Ensure no duplicate approvals
   - Confirm proposal hasn't expired

2. **Transaction fails silently**
   - Check RPC endpoint health
   - Verify sponsor wallet has SOL
   - Ensure all signers signed transaction
   - Check program allowlist configuration

3. **High gas costs**
   - Batch multiple operations together
   - Use versioned transactions (v0)
   - Optimize instruction data size
   - Consider compute unit price

4. **Slow proposal execution**
   - Use confirmed commitment for faster updates
   - Implement WebSocket subscriptions
   - Cache account data locally
   - Use dedicated RPC endpoint

### Debug Mode

```typescript
// Enable debug logging
const service = new SquadsSmartWalletService(rpcUrl, wallet);
service.enableDebug(true);

// View detailed transaction logs
service.on('transaction', (event) => {
  console.log('Transaction event:', event);
});

// Monitor approval events
service.on('approval', (event) => {
  console.log('New approval:', event);
});
```

## Additional Resources

- [Squads Protocol Documentation](https://docs.squads.so/)
- [Crossmint Gas Sponsorship Guide](https://docs.crossmint.com/wallets/gas-sponsorship)
- [Solana Smart Wallet Best Practices](https://docs.solana.com/developing/programming-model/accounts)
- [Multi-Party Computation Overview](https://en.wikipedia.org/wiki/Secure_multi-party_computation)

## Conclusion

Smart contract wallets with Squads Protocol and Crossmint enable BlockDrive to offer enterprise-grade security, programmable permissions, and seamless user experiences. By combining multi-signature custody with gas sponsorship, we can onboard users without requiring them to understand blockchain complexity while maintaining the highest security standards for treasury management and automated operations.

The integration supports everything from simple 2-of-3 multisigs for personal use to complex 5-of-9 DAO treasuries with time locks and role-based permissions. Gas sponsorship ensures that users never need to worry about transaction fees, making blockchain interactions as smooth as traditional web applications.
