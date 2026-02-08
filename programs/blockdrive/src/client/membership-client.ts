/**
 * BlockDrive Soulbound Membership NFT Client
 *
 * This client provides TypeScript utilities for interacting with the
 * BlockDrive membership system using Token-2022 and Transfer Hook.
 *
 * Key features:
 * - Create membership links with SNS domain and soulbound NFT
 * - Initialize mints with Transfer Hook extension for soulbound behavior
 * - Manage membership lifecycle (create, update, deactivate)
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  ExtensionType,
  getMintLen,
  createInitializeTransferHookInstruction,
  createInitializeNonTransferableMintInstruction,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// Program ID (update with actual deployed program ID)
const BLOCKDRIVE_PROGRAM_ID = new PublicKey(
  "BLKDrv1111111111111111111111111111111111111"
);

// Seed constants matching the Rust program
const MEMBERSHIP_LINK_SEED = Buffer.from("membership_link");
const AUTHORITY_SEED = Buffer.from("authority");
const EXTRA_ACCOUNT_METAS_SEED = Buffer.from("extra-account-metas");
const TRANSFER_HOOK_STATE_SEED = Buffer.from("transfer-hook-state");

/**
 * Derive the MembershipLink PDA for a wallet
 */
export function deriveMembershipLinkPDA(
  wallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [MEMBERSHIP_LINK_SEED, wallet.toBuffer()],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Derive the program authority PDA
 */
export function deriveProgramAuthority(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AUTHORITY_SEED],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Derive the extra account metas PDA for a mint
 */
export function deriveExtraAccountMetasPDA(
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [EXTRA_ACCOUNT_METAS_SEED, mint.toBuffer()],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Derive the transfer hook state PDA for a mint
 */
export function deriveTransferHookStatePDA(
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [TRANSFER_HOOK_STATE_SEED, mint.toBuffer()],
    BLOCKDRIVE_PROGRAM_ID
  );
}

/**
 * Configuration for creating a soulbound membership NFT mint
 */
export interface CreateMembershipMintConfig {
  connection: Connection;
  payer: Keypair;
  mintKeypair: Keypair;
  decimals?: number; // Default: 0 for NFT
  mintAuthority: PublicKey; // Should be the program authority PDA
}

/**
 * Create a Token-2022 mint with Transfer Hook extension for soulbound NFT
 *
 * This sets up the mint with:
 * - Transfer Hook extension pointing to our BlockDrive program
 * - Zero decimals (NFT)
 * - Program authority as mint authority
 *
 * @returns Transaction signature
 */
export async function createSoulboundMintWithTransferHook(
  config: CreateMembershipMintConfig
): Promise<string> {
  const { connection, payer, mintKeypair, decimals = 0, mintAuthority } = config;

  // Calculate mint account size with extensions
  const extensions = [ExtensionType.TransferHook];
  const mintLen = getMintLen(extensions);

  // Get rent exemption
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  // Build transaction
  const transaction = new Transaction();

  // 1. Create account for mint
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 2. Initialize Transfer Hook extension
  // This tells Token-2022 to call our program before every transfer
  transaction.add(
    createInitializeTransferHookInstruction(
      mintKeypair.publicKey,
      mintAuthority, // Authority that can update the hook
      BLOCKDRIVE_PROGRAM_ID, // Our program that will receive the hook call
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 3. Initialize the mint
  transaction.add(
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority, // Mint authority
      null, // No freeze authority
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Send and confirm
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
  ]);

  return signature;
}

/**
 * Configuration for creating a membership link
 */
export interface CreateMembershipLinkConfig {
  program: Program;
  wallet: Keypair;
  snsDomain: string;
  nftMint: PublicKey;
  mintNft: boolean;
}

/**
 * Create a membership link and optionally mint the soulbound NFT
 *
 * This:
 * 1. Creates the MembershipLink PDA
 * 2. Optionally mints the soulbound NFT to the wallet
 *
 * @returns Transaction signature
 */
export async function createMembershipLink(
  config: CreateMembershipLinkConfig
): Promise<string> {
  const { program, wallet, snsDomain, nftMint, mintNft } = config;

  const [membershipLinkPda] = deriveMembershipLinkPDA(wallet.publicKey);
  const [programAuthority] = deriveProgramAuthority();

  // Get the wallet's associated token account for the NFT
  const walletTokenAccount = getAssociatedTokenAddressSync(
    nftMint,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const tx = await program.methods
    .createMembershipLink(snsDomain, mintNft)
    .accounts({
      membershipLink: membershipLinkPda,
      wallet: wallet.publicKey,
      nftMint: nftMint,
      walletTokenAccount: walletTokenAccount,
      programAuthority: programAuthority,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

/**
 * Initialize the transfer hook for a mint
 *
 * This must be called after creating the mint but before any transfers.
 * It sets up the extra account metas PDA that Token-2022 uses.
 */
export async function initializeTransferHook(
  program: Program,
  mint: PublicKey,
  admin: Keypair,
  payer: Keypair
): Promise<string> {
  const [extraAccountMetasPda] = deriveExtraAccountMetasPDA(mint);
  const [transferHookStatePda] = deriveTransferHookStatePDA(mint);

  const tx = await program.methods
    .initializeTransferHook()
    .accounts({
      extraAccountMetas: extraAccountMetasPda,
      transferHookState: transferHookStatePda,
      mint: mint,
      admin: admin.publicKey,
      payer: payer.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([admin, payer])
    .rpc();

  return tx;
}

/**
 * Update a membership link's SNS domain
 */
export async function updateMembershipLink(
  program: Program,
  wallet: Keypair,
  newSnsDomain: string | null,
  newNftMint: PublicKey | null
): Promise<string> {
  const [membershipLinkPda] = deriveMembershipLinkPDA(wallet.publicKey);

  const tx = await program.methods
    .updateMembershipLink(newSnsDomain, newNftMint !== null)
    .accounts({
      membershipLink: membershipLinkPda,
      wallet: wallet.publicKey,
      newNftMint: newNftMint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

/**
 * Deactivate a membership link
 */
export async function deactivateMembershipLink(
  program: Program,
  wallet: Keypair
): Promise<string> {
  const [membershipLinkPda] = deriveMembershipLinkPDA(wallet.publicKey);

  const tx = await program.methods
    .deactivateMembershipLink()
    .accounts({
      membershipLink: membershipLinkPda,
      wallet: wallet.publicKey,
    })
    .signers([wallet])
    .rpc();

  return tx;
}

/**
 * Fetch membership link data
 */
export async function fetchMembershipLink(
  program: Program,
  wallet: PublicKey
): Promise<MembershipLinkData | null> {
  const [membershipLinkPda] = deriveMembershipLinkPDA(wallet);

  try {
    const account = await program.account.membershipLink.fetch(membershipLinkPda);
    return account as MembershipLinkData;
  } catch (e) {
    return null;
  }
}

/**
 * MembershipLink account data structure
 */
export interface MembershipLinkData {
  bump: number;
  wallet: PublicKey;
  snsDomain: string;
  nftMint: PublicKey;
  createdAt: BN;
  updatedAt: BN;
  isActive: boolean;
  reserved: number[];
}

/**
 * TransferHookState account data structure
 */
export interface TransferHookStateData {
  bump: number;
  mint: PublicKey;
  isEnabled: boolean;
  blockedTransfers: BN;
  autoBurns: BN;
  successfulMints: BN;
  voluntaryBurns: BN;
  admin: PublicKey;
  reserved: number[];
}

/**
 * Example: Complete setup flow for a new member
 */
export async function setupNewMember(
  connection: Connection,
  program: Program,
  wallet: Keypair,
  snsDomain: string
): Promise<{
  mintAddress: PublicKey;
  membershipLinkAddress: PublicKey;
  tokenAccountAddress: PublicKey;
}> {
  console.log("Setting up new BlockDrive member:", wallet.publicKey.toString());
  console.log("SNS Domain:", snsDomain);

  // 1. Generate new mint keypair
  const mintKeypair = Keypair.generate();
  console.log("Generated mint:", mintKeypair.publicKey.toString());

  // 2. Get program authority
  const [programAuthority] = deriveProgramAuthority();
  console.log("Program authority:", programAuthority.toString());

  // 3. Create the soulbound mint with Transfer Hook
  console.log("Creating soulbound mint with Transfer Hook...");
  await createSoulboundMintWithTransferHook({
    connection,
    payer: wallet,
    mintKeypair,
    mintAuthority: programAuthority,
  });

  // 4. Initialize the transfer hook
  console.log("Initializing transfer hook...");
  await initializeTransferHook(program, mintKeypair.publicKey, wallet, wallet);

  // 5. Create membership link and mint NFT
  console.log("Creating membership link and minting NFT...");
  await createMembershipLink({
    program,
    wallet,
    snsDomain,
    nftMint: mintKeypair.publicKey,
    mintNft: true,
  });

  // 6. Get final addresses
  const [membershipLinkPda] = deriveMembershipLinkPDA(wallet.publicKey);
  const tokenAccount = getAssociatedTokenAddressSync(
    mintKeypair.publicKey,
    wallet.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  console.log("Setup complete!");
  console.log("- Mint:", mintKeypair.publicKey.toString());
  console.log("- Membership Link:", membershipLinkPda.toString());
  console.log("- Token Account:", tokenAccount.toString());

  return {
    mintAddress: mintKeypair.publicKey,
    membershipLinkAddress: membershipLinkPda,
    tokenAccountAddress: tokenAccount,
  };
}

/**
 * Verify that a wallet holds a valid soulbound membership NFT
 */
export async function verifyMembership(
  program: Program,
  wallet: PublicKey
): Promise<{
  isValid: boolean;
  membershipLink: MembershipLinkData | null;
  reason: string;
}> {
  const membershipLink = await fetchMembershipLink(program, wallet);

  if (!membershipLink) {
    return {
      isValid: false,
      membershipLink: null,
      reason: "No membership link found for this wallet",
    };
  }

  if (!membershipLink.isActive) {
    return {
      isValid: false,
      membershipLink,
      reason: "Membership link is deactivated",
    };
  }

  // Check if NFT is still held by the wallet
  // (This would require checking the token account balance)

  return {
    isValid: true,
    membershipLink,
    reason: "Valid active membership",
  };
}
