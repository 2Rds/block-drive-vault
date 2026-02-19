/**
 * BlockDrive Devnet Setup Script
 *
 * One-time setup to create on-chain infrastructure on Solana devnet:
 * 1. Bubblegum V2 Merkle tree (for soulbound cNFTs)
 * 2. MPL-Core collection ("BlockDrive Membership")
 * 3. SNS parent domain registration (blockdrive.sol on devnet)
 *
 * Run: cd scripts && npm install --prefix . --package-lock=false -f solana-setup-package.json && npx tsx setup-devnet.ts
 *
 * Outputs three addresses to paste into workers/api-gateway/wrangler.toml:
 *   MERKLE_TREE_ADDRESS, GLOBAL_COLLECTION_ADDRESS, SNS_PARENT_DOMAIN_KEY
 *
 * Treasury wallet: FJ6jvjHVEKPmcGWrSe1b8HJ8maZp68PY5AzZ8PQnNtZ3 (must have ≥1 devnet SOL)
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createTree,
  mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import {
  createCollection,
  mplCore,
} from '@metaplex-foundation/mpl-core';
import {
  generateSigner,
  keypairIdentity,
  percentAmount,
  publicKey as umiPublicKey,
} from '@metaplex-foundation/umi';
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getHashedNameSync,
  getNameAccountKeySync,
  NameRegistryState,
} from '@bonfida/spl-name-service';
import bs58 from 'bs58';

// ─── Configuration ──────────────────────────────────────

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

if (!TREASURY_PRIVATE_KEY) {
  console.error('ERROR: Set TREASURY_PRIVATE_KEY env var (base58 encoded private key)');
  console.error('  export TREASURY_PRIVATE_KEY="your-base58-private-key"');
  process.exit(1);
}

// Merkle tree config: maxDepth=10, maxBufferSize=32 → ~1,024 leaf capacity
// Create a new tree when approaching capacity
const TREE_MAX_DEPTH = 10;
const TREE_MAX_BUFFER_SIZE = 32;

const COLLECTION_NAME = 'BlockDrive Membership';
const COLLECTION_SYMBOL = 'BDRIVE';
const COLLECTION_DESCRIPTION = 'BlockDrive membership and username domain NFTs — soulbound cNFTs on Solana';
const COLLECTION_IMAGE = 'https://blockdrive.co/logo.png';

const SNS_PARENT_DOMAIN = 'blockdrive';

// ─── Setup ──────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' BlockDrive Devnet Infrastructure Setup');
  console.log('═══════════════════════════════════════════════════');
  console.log(`RPC: ${RPC_URL}`);
  console.log('');

  // Decode treasury keypair
  const treasurySecretKey = bs58.decode(TREASURY_PRIVATE_KEY!);
  const treasuryKeypair = Keypair.fromSecretKey(treasurySecretKey);
  console.log(`Treasury: ${treasuryKeypair.publicKey.toBase58()}`);

  // Check balance
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(treasuryKeypair.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.15 * LAMPORTS_PER_SOL) {
    console.error('ERROR: Treasury needs at least 0.15 SOL for setup.');
    console.error(`  Send SOL to: ${treasuryKeypair.publicKey.toBase58()}`);
    process.exit(1);
  }
  console.log('');

  // Create Umi instance
  const umi = createUmi(RPC_URL)
    .use(mplBubblegum())
    .use(mplCore());

  // Convert keypair to Umi format
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(treasurySecretKey);
  umi.use(keypairIdentity(umiKeypair));

  // ─── Step 1: Create Bubblegum V2 Merkle Tree ───────────

  console.log('Step 1: Creating Bubblegum V2 Merkle Tree...');
  console.log(`  maxDepth: ${TREE_MAX_DEPTH}, maxBufferSize: ${TREE_MAX_BUFFER_SIZE}`);
  console.log(`  Capacity: ~${Math.pow(2, TREE_MAX_DEPTH).toLocaleString()} cNFTs`);

  const merkleTree = generateSigner(umi);

  try {
    const treeBuilder = await createTree(umi, {
      merkleTree,
      maxDepth: TREE_MAX_DEPTH,
      maxBufferSize: TREE_MAX_BUFFER_SIZE,
      public: false, // Only treasury can mint
    });
    const treeTx = await treeBuilder.sendAndConfirm(umi);

    console.log(`  ✓ Merkle tree created: ${merkleTree.publicKey}`);
    console.log(`  TX: ${bs58.encode(treeTx.signature)}`);
  } catch (err: any) {
    console.error('  ✗ Failed to create Merkle tree:', err.message);
    process.exit(1);
  }
  console.log('');

  // ─── Step 2: Create MPL-Core Collection ─────────────────

  console.log('Step 2: Creating MPL-Core Collection...');
  console.log(`  Name: "${COLLECTION_NAME}" (${COLLECTION_SYMBOL})`);

  const collectionSigner = generateSigner(umi);

  try {
    const collectionTx = await createCollection(umi, {
      collection: collectionSigner,
      name: COLLECTION_NAME,
      uri: '', // Will be updated with metadata URI later
    }).sendAndConfirm(umi);

    console.log(`  ✓ Collection created: ${collectionSigner.publicKey}`);
    console.log(`  TX: ${bs58.encode(collectionTx.signature)}`);
  } catch (err: any) {
    console.error('  ✗ Failed to create collection:', err.message);
    process.exit(1);
  }
  console.log('');

  // ─── Step 3: Check/Register SNS Parent Domain ──────────

  console.log('Step 3: Checking SNS parent domain...');
  console.log(`  Domain: ${SNS_PARENT_DOMAIN}.sol`);

  let snsParentDomainKey: string;

  try {
    // Derive the SNS account key for blockdrive.sol
    const hashedName = getHashedNameSync(SNS_PARENT_DOMAIN);
    const nameAccountKey = getNameAccountKeySync(
      hashedName,
      undefined, // No class
      undefined  // No parent (TLD)
    );

    console.log(`  Derived SNS key: ${nameAccountKey.toBase58()}`);

    // Check if domain already exists on devnet
    try {
      const nameAccount = await NameRegistryState.retrieve(connection, nameAccountKey);
      console.log(`  ✓ Domain already registered. Owner: ${nameAccount.registry.owner.toBase58()}`);
      snsParentDomainKey = nameAccountKey.toBase58();
    } catch {
      console.log('  Domain not registered on devnet.');
      console.log('  NOTE: SNS domain registration on devnet requires the SNS registrar program.');
      console.log('  For devnet testing, use the derived key as the parent domain key.');
      console.log('  On mainnet, blockdrive.sol is already owned by the treasury wallet.');
      snsParentDomainKey = nameAccountKey.toBase58();
    }
  } catch (err: any) {
    console.error('  ✗ SNS domain check failed:', err.message);
    console.log('  Using placeholder — update manually after SNS registration.');
    snsParentDomainKey = 'UPDATE_AFTER_SNS_REGISTRATION';
  }
  console.log('');

  // ─── Output ─────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════');
  console.log(' Setup Complete! Add these to wrangler.toml [vars]:');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`MERKLE_TREE_ADDRESS = "${merkleTree.publicKey}"`);
  console.log(`GLOBAL_COLLECTION_ADDRESS = "${collectionSigner.publicKey}"`);
  console.log(`SNS_PARENT_DOMAIN_KEY = "${snsParentDomainKey}"`);
  console.log('');
  console.log('Also set the secret:');
  console.log('  wrangler secret put TREASURY_PRIVATE_KEY');
  console.log('');
  console.log('Verify on Solana Explorer (devnet):');
  console.log(`  Tree: https://explorer.solana.com/address/${merkleTree.publicKey}?cluster=devnet`);
  console.log(`  Collection: https://explorer.solana.com/address/${collectionSigner.publicKey}?cluster=devnet`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
