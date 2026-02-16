/**
 * Solana Native Minting Routes (SNS + Bubblegum V2)
 *
 * Replaces Crossmint minting with direct on-chain operations:
 * - SNS subdomains: username.blockdrive.sol
 * - Bubblegum V2 soulbound cNFTs: membership NFTs tied to SNS domains
 *
 * All operations are gas-sponsored by the treasury wallet.
 * Users never sign — everything is headless.
 *
 * Routes:
 *   POST /solana/onboard-user       — Combined SNS subdomain + cNFT mint
 *   POST /solana/create-org-domain  — Org subdomain + org domain cNFT
 *   GET  /solana/resolve/:domain    — SNS domain resolution
 *   POST /solana/revoke-subdomain   — Admin subdomain revocation
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createSubdomain,
  transferSubdomain,
  resolve,
  getDomainKeySync,
  NameRegistryState,
} from '@bonfida/spl-name-service';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mintV2,
  parseLeafFromMintV2Transaction,
  mplBubblegum,
} from '@metaplex-foundation/mpl-bubblegum';
import {
  createCollectionV2,
  updateCollectionV1,
} from '@metaplex-foundation/mpl-core';
import {
  keypairIdentity,
  publicKey as umiPublicKey,
  generateSigner,
  some,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import { SupabaseClient } from './supabase';

// ─── Types ──────────────────────────────────────────────

export interface SolanaEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SOLANA_RPC_URL: string;
  SOLANA_NETWORK: string;
  MERKLE_TREE_ADDRESS: string;
  GLOBAL_COLLECTION_ADDRESS: string;
  SNS_PARENT_DOMAIN_KEY: string;
  TREASURY_PRIVATE_KEY: string;
  R2_STORAGE: R2Bucket;
}

interface OnboardUserBody {
  clerkUserId: string;
  username: string;
  recipientWalletAddress: string;
  organizationId?: string;
  organizationSubdomain?: string;
}

interface CreateOrgDomainBody {
  organizationId: string;
  orgName: string;
  orgSubdomain: string;
  recipientWalletAddress: string;
  logoUrl?: string;
}

interface UpdateOrgCollectionBody {
  organizationId: string;
  name?: string;
  logoUrl?: string;
  description?: string;
}

interface RevokeSubdomainBody {
  fullDomain: string;
}

// ─── Helpers ────────────────────────────────────────────

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Decode Clerk JWT payload to extract sub (user ID). No verification — auth validated upstream. */
function parseClerkToken(request: Request): string {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }
  const token = auth.slice(7);
  const payloadB64 = token.split('.')[1];
  if (!payloadB64) throw new Error('Malformed JWT');
  const payload = JSON.parse(atob(payloadB64));
  if (!payload.sub) throw new Error('JWT missing sub claim');
  return payload.sub as string;
}

function getConnection(env: SolanaEnv): Connection {
  return new Connection(env.SOLANA_RPC_URL, 'confirmed');
}

function getTreasuryKeypair(env: SolanaEnv): Keypair {
  const secretKey = bs58.decode(env.TREASURY_PRIVATE_KEY);
  return Keypair.fromSecretKey(secretKey);
}

function getUmi(env: SolanaEnv) {
  const umi = createUmi(env.SOLANA_RPC_URL).use(mplBubblegum());
  const secretKey = bs58.decode(env.TREASURY_PRIVATE_KEY);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(umiKeypair));
  return umi;
}

function newSupabase(env: SolanaEnv): SupabaseClient {
  return new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Validate username: 3-20 chars, alphanumeric + underscore, lowercase */
function validateUsername(username: string): { valid: boolean; error?: string } {
  const normalized = username.toLowerCase().trim();
  if (normalized.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (normalized.length > 20) return { valid: false, error: 'Username must be 20 characters or less' };
  if (!/^[a-z0-9_]+$/.test(normalized)) return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  const reserved = ['admin', 'blockdrive', 'system', 'support', 'help', 'api', 'www', 'mail', 'ftp'];
  if (reserved.includes(normalized)) return { valid: false, error: 'This username is reserved' };
  return { valid: true };
}

/** Build metadata URI for a cNFT — served by our /metadata/cnft/ endpoint */
function buildMetadataUri(_env: SolanaEnv, fullDomain: string): string {
  // In production this would use the custom domain; for now use worker URL pattern
  return `https://blockdrive-api-gateway.workers.dev/metadata/cnft/${encodeURIComponent(fullDomain)}`;
}

/** Store metadata JSON in R2 for the /metadata/ endpoint to serve */
async function storeMetadataInR2(
  r2: R2Bucket,
  fullDomain: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const key = `metadata/cnfts/${fullDomain}.json`;
  await r2.put(key, JSON.stringify(metadata), {
    httpMetadata: { contentType: 'application/json' },
  });
}

/** Check treasury balance and warn if low */
async function checkTreasuryBalance(connection: Connection, treasury: PublicKey): Promise<void> {
  const balance = await connection.getBalance(treasury);
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.warn(`[solana] Treasury balance LOW: ${balance / LAMPORTS_PER_SOL} SOL`);
  }
}

// ─── Router ─────────────────────────────────────────────

export async function handleSolanaRequest(
  request: Request,
  env: SolanaEnv,
  url: URL
): Promise<Response> {
  if (!env.TREASURY_PRIVATE_KEY) {
    return json({ error: 'TREASURY_PRIVATE_KEY not configured' }, 500);
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, 500);
  }

  const route = url.pathname.replace('/solana/', '');

  try {
    switch (true) {
      case request.method === 'POST' && route === 'onboard-user':
        return await handleOnboardUser(request, env);
      case request.method === 'POST' && route === 'create-org-domain':
        return await handleCreateOrgDomain(request, env);
      case request.method === 'GET' && route.startsWith('resolve/'):
        return await handleResolve(env, route.replace('resolve/', ''));
      case request.method === 'POST' && route === 'revoke-subdomain':
        return await handleRevokeSubdomain(request, env);
      case request.method === 'POST' && route === 'update-org-collection':
        return await handleUpdateOrgCollection(request, env);
      default:
        return json({ error: `Unknown solana route: ${route}` }, 404);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[solana/${route}] Error:`, message);
    return json({ success: false, error: message }, 400);
  }
}

// ─── POST /solana/onboard-user ──────────────────────────

async function handleOnboardUser(
  request: Request,
  env: SolanaEnv
): Promise<Response> {
  const tokenUserId = parseClerkToken(request);
  const body: OnboardUserBody = await request.json();
  const {
    clerkUserId, username, recipientWalletAddress,
    organizationId, organizationSubdomain,
  } = body;

  if (!clerkUserId || !username) throw new Error('Missing required fields: clerkUserId and username');
  if (tokenUserId !== clerkUserId) throw new Error('User ID mismatch — unauthorized');
  if (!recipientWalletAddress) throw new Error('Missing recipientWalletAddress');

  const validation = validateUsername(username);
  if (!validation.valid) throw new Error(validation.error);

  const normalized = username.toLowerCase().trim();
  const isOrgDomain = !!(organizationId && organizationSubdomain);
  const fullDomain = isOrgDomain
    ? `${normalized}.${organizationSubdomain!.toLowerCase()}.blockdrive.sol`
    : `${normalized}.blockdrive.sol`;
  const parentDomain = isOrgDomain
    ? `${organizationSubdomain!.toLowerCase()}.blockdrive.sol`
    : 'blockdrive.sol';
  const domainType = isOrgDomain ? 'organization' : 'individual';

  console.log(`[solana/onboard-user] ${domainType}: ${fullDomain} → ${recipientWalletAddress}`);

  const db = newSupabase(env);

  // Idempotency: check if already minted
  const existingQuery = isOrgDomain
    ? `full_domain=eq.${fullDomain}&select=full_domain,tx_signature,asset_id`
    : `username=eq.${normalized}&organization_id=is.null&select=full_domain,tx_signature,asset_id`;
  const existing = await db.selectOne<{ full_domain: string; tx_signature: string | null; asset_id: string | null }>(
    'username_nfts', existingQuery
  );
  if (existing?.tx_signature) {
    return json({
      success: true,
      message: 'Domain already minted',
      nft: {
        username: normalized,
        fullDomain: existing.full_domain,
        txSignature: existing.tx_signature,
        assetId: existing.asset_id,
        status: 'confirmed',
      },
      alreadyExists: true,
    });
  }

  const snsConnection = getConnection(env);  const treasury = getTreasuryKeypair(env);
  const recipientPubkey = new PublicKey(recipientWalletAddress);

  await checkTreasuryBalance(snsConnection, treasury.publicKey);

  // ─── Step 1: Create SNS subdomain ────────
  let snsAccountKey: string | null = null;
  try {
    const subdomainName = isOrgDomain
      ? `${normalized}.${organizationSubdomain!.toLowerCase()}.blockdrive`
      : `${normalized}.blockdrive`;

    console.log(`[solana/onboard-user] Creating SNS subdomain: ${subdomainName}.sol`);

    // Check if subdomain already exists
    let subdomainExists = false;
    try {
      const { pubkey } = getDomainKeySync(subdomainName);
      await NameRegistryState.retrieve(snsConnection, pubkey);
      subdomainExists = true;
      snsAccountKey = pubkey.toBase58();
      console.log(`[solana/onboard-user] SNS subdomain already exists: ${snsAccountKey}`);
    } catch {
      // Domain doesn't exist — proceed to create
    }

    if (!subdomainExists) {
      // Create subdomain — treasury is parent domain owner
      const createIxs = await createSubdomain(
        snsConnection,
        `${subdomainName}.sol`,
        treasury.publicKey
      );

      const createTx = new Transaction().add(...createIxs);
      const createSig = await sendAndConfirmTransaction(snsConnection, createTx, [treasury]);
      console.log(`[solana/onboard-user] SNS subdomain created. TX: ${createSig}`);

      // Get the subdomain's account key
      const { pubkey } = getDomainKeySync(subdomainName);
      snsAccountKey = pubkey.toBase58();
    }

    // Transfer subdomain to user's wallet (treasury signs as parent owner)
    const transferIx = await transferSubdomain(
      snsConnection,
      `${subdomainName}.sol`,
      recipientPubkey,
      true // isParentSigner — treasury owns the parent domain
    );

    const transferTx = new Transaction().add(transferIx);
    const transferSig = await sendAndConfirmTransaction(snsConnection, transferTx, [treasury]);
    console.log(`[solana/onboard-user] SNS subdomain transferred. TX: ${transferSig}`);
  } catch (snsErr) {
    console.error('[solana/onboard-user] SNS error (non-fatal):', snsErr);
    // Continue — cNFT mint can proceed even if SNS fails
  }

  // ─── Step 2: Build and store cNFT metadata ──────────
  const nftMetadata = {
    name: fullDomain,
    description: `BlockDrive Membership — ${fullDomain}`,
    image: 'https://blockdrive.io/logo.png',
    attributes: [
      { trait_type: 'domain', value: fullDomain },
      { trait_type: 'username', value: normalized },
      { trait_type: 'domain_type', value: domainType },
      { trait_type: 'parent_domain', value: parentDomain },
      { trait_type: 'tier', value: 'explorer' },
      { trait_type: 'member_since', value: new Date().toISOString().split('T')[0] },
      { trait_type: 'soulbound', value: 'true' },
      ...(isOrgDomain ? [
        { trait_type: 'organization', value: organizationSubdomain },
        { trait_type: 'organization_id', value: organizationId },
      ] : []),
    ],
  };

  const metadataUri = buildMetadataUri(env, fullDomain);
  await storeMetadataInR2(env.R2_STORAGE, fullDomain, nftMetadata);

  // ─── Step 3: Mint Bubblegum V2 soulbound cNFT ──────
  let txSignature: string | null = null;
  let assetId: string | null = null;
  let leafIndex: number | null = null;

  try {
    const umi = getUmi(env);
    const merkleTree = umiPublicKey(env.MERKLE_TREE_ADDRESS);

    // Use org-specific collection when minting org membership NFTs
    let collectionAddress = env.GLOBAL_COLLECTION_ADDRESS;
    if (isOrgDomain && organizationId) {
      const org = await db.selectOne<{ org_collection_address: string | null }>(
        'organizations', `id=eq.${organizationId}&select=org_collection_address`
      );
      if (org?.org_collection_address) {
        collectionAddress = org.org_collection_address;
      }
    }
    const coreCollection = umiPublicKey(collectionAddress);
    const leafOwner = umiPublicKey(recipientWalletAddress);

    console.log(`[solana/onboard-user] Minting cNFT to ${recipientWalletAddress} (tree: ${env.MERKLE_TREE_ADDRESS})`);

    const mintResult = await mintV2(umi, {
      leafOwner,
      merkleTree,
      collectionAuthority: umi.identity,
      coreCollection,
      metadata: {
        name: fullDomain,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        collection: some(coreCollection),
        creators: [
          {
            address: umi.identity.publicKey,
            verified: true,
            share: 100,
          },
        ],
      },
    }).sendAndConfirm(umi);

    txSignature = bs58.encode(mintResult.signature);
    console.log(`[solana/onboard-user] cNFT minted. TX: ${txSignature}`);

    // Parse leaf to get asset ID
    try {
      const leaf = await parseLeafFromMintV2Transaction(umi, mintResult.signature);
      assetId = leaf.id.toString();
      leafIndex = leaf.nonce ? Number(leaf.nonce) : null;
      console.log(`[solana/onboard-user] Asset ID: ${assetId}, Leaf index: ${leafIndex}`);
    } catch (parseErr) {
      console.warn('[solana/onboard-user] Could not parse leaf (non-fatal):', parseErr);
    }
  } catch (mintErr) {
    console.error('[solana/onboard-user] Mint error:', mintErr);
    throw new Error(`cNFT minting failed: ${mintErr instanceof Error ? mintErr.message : 'Unknown error'}`);
  }

  // ─── Step 4: Update DB ──────────────────────────────
  // Get or create profile
  let profile = await db.selectOne<{ id: string }>(
    'profiles', `clerk_user_id=eq.${clerkUserId}&select=id`
  );
  if (!profile) {
    try {
      profile = await db.insert<{ id: string }>('profiles', {
        clerk_user_id: clerkUserId,
        username: normalized,
      });
    } catch (err) {
      console.error('[solana/onboard-user] Profile creation error:', err);
    }
  }

  // Insert NFT record
  let nftRecord: { id: string } | null = null;
  try {
    nftRecord = await db.insert<{ id: string }>('username_nfts', {
      user_id: profile?.id || null,
      clerk_user_id: clerkUserId,
      username: normalized,
      full_domain: fullDomain,
      tx_signature: txSignature,
      asset_id: assetId,
      merkle_tree_address: env.MERKLE_TREE_ADDRESS,
      leaf_index: leafIndex,
      sns_account_key: snsAccountKey,
      is_soulbound: true,
      mint_status: 'confirmed',
      mint_method: 'bubblegum_v2',
      chain: 'solana',
      recipient_address: recipientWalletAddress,
      metadata: nftMetadata,
      organization_id: organizationId || null,
      domain_type: domainType,
      parent_domain: parentDomain,
    });
  } catch (err) {
    console.error('[solana/onboard-user] DB insert error:', err);
  }

  // Update profile with SNS domain (individual domains only)
  if (!isOrgDomain) {
    try {
      await db.update(
        'profiles',
        `clerk_user_id=eq.${clerkUserId}`,
        { username: normalized, sns_domain: fullDomain }
      );
    } catch (err) {
      console.error('[solana/onboard-user] Profile update error:', err);
    }
  }

  // Update org member record (org domains only)
  if (isOrgDomain && nftRecord) {
    try {
      await db.update(
        'organization_members',
        `organization_id=eq.${organizationId}&clerk_user_id=eq.${clerkUserId}`,
        { org_username: normalized, org_subdomain_nft_id: nftRecord.id }
      );
    } catch (err) {
      console.error('[solana/onboard-user] Org member update error:', err);
    }
  }

  return json({
    success: true,
    message: `Successfully created ${fullDomain}`,
    nft: {
      username: normalized,
      fullDomain,
      domainType,
      parentDomain,
      organizationId: organizationId || null,
      organizationSubdomain: organizationSubdomain || null,
      txSignature,
      assetId,
      snsAccountKey,
      status: 'confirmed',
    },
  });
}

// ─── POST /solana/create-org-domain ─────────────────────

async function handleCreateOrgDomain(
  request: Request,
  env: SolanaEnv
): Promise<Response> {
  const clerkUserId = parseClerkToken(request);
  const body: CreateOrgDomainBody = await request.json();
  const { organizationId, orgName, orgSubdomain, recipientWalletAddress, logoUrl } = body;

  if (!organizationId || !orgName || !orgSubdomain) {
    throw new Error('Missing required fields: organizationId, orgName, orgSubdomain');
  }
  if (!recipientWalletAddress) {
    throw new Error('Missing recipientWalletAddress');
  }

  const fullDomain = `${orgSubdomain.toLowerCase()}.blockdrive.sol`;
  console.log(`[solana/create-org-domain] ${fullDomain} → ${recipientWalletAddress}`);

  const db = newSupabase(env);

  // Verify org membership (owner/admin)
  const membership = await db.selectOne<{ role: string }>(
    'organization_members',
    `organization_id=eq.${organizationId}&clerk_user_id=eq.${clerkUserId}&select=role`
  );
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only organization owners/admins can create org domains');
  }

  // Idempotency: check if org already has domain NFT
  const existingOrg = await db.selectOne<{ org_nft_mint: string | null; sns_account_key: string | null }>(
    'organizations', `id=eq.${organizationId}&select=org_nft_mint,sns_account_key`
  );
  if (existingOrg?.org_nft_mint) {
    return json({
      success: true,
      message: 'Organization domain already minted',
      nft: { fullDomain, status: 'confirmed' },
      alreadyExists: true,
    });
  }

  const snsConnection = getConnection(env);  const treasury = getTreasuryKeypair(env);
  const recipientPubkey = new PublicKey(recipientWalletAddress);

  await checkTreasuryBalance(snsConnection, treasury.publicKey);

  // ─── Step 1: Create org SNS subdomain ────
  let snsAccountKey: string | null = null;
  try {
    const subdomainName = `${orgSubdomain.toLowerCase()}.blockdrive`;

    let subdomainExists = false;
    try {
      const { pubkey } = getDomainKeySync(subdomainName);
      await NameRegistryState.retrieve(snsConnection, pubkey);
      subdomainExists = true;
      snsAccountKey = pubkey.toBase58();
    } catch {
      // doesn't exist yet
    }

    if (!subdomainExists) {
      const createIxs = await createSubdomain(
        snsConnection,
        `${subdomainName}.sol`,
        treasury.publicKey
      );
      const createTx = new Transaction().add(...createIxs);
      await sendAndConfirmTransaction(snsConnection, createTx, [treasury]);

      const { pubkey } = getDomainKeySync(subdomainName);
      snsAccountKey = pubkey.toBase58();
    }

    // Transfer to org owner's wallet
    const transferIx = await transferSubdomain(
      snsConnection,
      `${subdomainName}.sol`,
      recipientPubkey,
      true
    );
    const transferTx = new Transaction().add(transferIx);
    await sendAndConfirmTransaction(snsConnection, transferTx, [treasury]);

    console.log(`[solana/create-org-domain] SNS subdomain created + transferred: ${snsAccountKey}`);
  } catch (snsErr) {
    console.error('[solana/create-org-domain] SNS error (non-fatal):', snsErr);
  }

  // ─── Step 1.5: Create per-org MPL-Core collection ───
  let orgCollectionAddress: string | null = null;
  try {
    const umi = getUmi(env);
    const orgCollectionSigner = generateSigner(umi);

    const collectionMetadata = {
      name: `${orgName} — BlockDrive`,
      description: `Official membership collection for ${orgName} on BlockDrive`,
      image: logoUrl || 'https://blockdrive.io/logo.png',
      external_url: `https://app.blockdrive.co/org/${orgSubdomain.toLowerCase()}`,
    };
    await storeMetadataInR2(env.R2_STORAGE, `collection-${orgSubdomain.toLowerCase()}`, collectionMetadata);
    const collectionUri = buildMetadataUri(env, `collection-${orgSubdomain.toLowerCase()}`);

    await createCollectionV2(umi, {
      collection: orgCollectionSigner,
      name: `${orgName} — BlockDrive`,
      uri: collectionUri,
    }).sendAndConfirm(umi);

    orgCollectionAddress = orgCollectionSigner.publicKey.toString();
    console.log(`[solana/create-org-domain] Org collection created: ${orgCollectionAddress}`);
  } catch (collErr) {
    console.error('[solana/create-org-domain] Collection creation error (non-fatal):', collErr);
    // Falls back to global collection if per-org creation fails
  }

  // ─── Step 2: Build and store metadata ───────────────
  const nftMetadata = {
    name: fullDomain,
    description: `${orgName} — Organization domain on BlockDrive`,
    image: logoUrl || 'https://blockdrive.io/logo.png',
    attributes: [
      { trait_type: 'domain', value: fullDomain },
      { trait_type: 'organization', value: orgName },
      { trait_type: 'domain_type', value: 'organization_root' },
      { trait_type: 'member_since', value: new Date().toISOString().split('T')[0] },
      { trait_type: 'soulbound', value: 'true' },
    ],
  };

  const metadataUri = buildMetadataUri(env, fullDomain);
  await storeMetadataInR2(env.R2_STORAGE, fullDomain, nftMetadata);

  // ─── Step 3: Mint org domain cNFT ───────────────────
  let txSignature: string | null = null;
  let assetId: string | null = null;

  try {
    const umi = getUmi(env);
    const merkleTree = umiPublicKey(env.MERKLE_TREE_ADDRESS);
    const coreCollection = umiPublicKey(orgCollectionAddress || env.GLOBAL_COLLECTION_ADDRESS);
    const leafOwner = umiPublicKey(recipientWalletAddress);

    const mintResult = await mintV2(umi, {
      leafOwner,
      merkleTree,
      collectionAuthority: umi.identity,
      coreCollection,
      metadata: {
        name: fullDomain,
        uri: metadataUri,
        sellerFeeBasisPoints: 0,
        collection: some(coreCollection),
        creators: [
          {
            address: umi.identity.publicKey,
            verified: true,
            share: 100,
          },
        ],
      },
    }).sendAndConfirm(umi);

    txSignature = bs58.encode(mintResult.signature);
    console.log(`[solana/create-org-domain] cNFT minted. TX: ${txSignature}`);

    try {
      const leaf = await parseLeafFromMintV2Transaction(umi, mintResult.signature);
      assetId = leaf.id.toString();
    } catch (parseErr) {
      console.warn('[solana/create-org-domain] Could not parse leaf:', parseErr);
    }
  } catch (mintErr) {
    console.error('[solana/create-org-domain] Mint error:', mintErr);
    throw new Error(`Org cNFT minting failed: ${mintErr instanceof Error ? mintErr.message : 'Unknown error'}`);
  }

  // ─── Step 4: Update DB ──────────────────────────────
  // Hard failure — if this fails, the on-chain collection address is lost forever
  try {
    await db.update(
      'organizations',
      `id=eq.${organizationId}`,
      {
        org_nft_mint: txSignature,
        sns_account_key: snsAccountKey,
        org_collection_address: orgCollectionAddress,
      }
    );
  } catch (err) {
    console.error('[solana/create-org-domain] Org update error:', err);
    throw new Error(`Failed to persist org data (collection address would be lost): ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Get profile for NFT record
  const profile = await db.selectOne<{ id: string }>(
    'profiles', `clerk_user_id=eq.${clerkUserId}&select=id`
  );

  try {
    await db.insert('username_nfts', {
      user_id: profile?.id || null,
      clerk_user_id: clerkUserId,
      username: orgSubdomain.toLowerCase(),
      full_domain: fullDomain,
      tx_signature: txSignature,
      asset_id: assetId,
      merkle_tree_address: env.MERKLE_TREE_ADDRESS,
      sns_account_key: snsAccountKey,
      is_soulbound: true,
      mint_status: 'confirmed',
      mint_method: 'bubblegum_v2',
      chain: 'solana',
      recipient_address: recipientWalletAddress,
      metadata: nftMetadata,
      organization_id: organizationId,
      domain_type: 'organization_root',
      parent_domain: 'blockdrive.sol',
    });
  } catch (err) {
    console.error('[solana/create-org-domain] DB insert error:', err);
  }

  return json({
    success: true,
    message: `Successfully created ${fullDomain} domain NFT`,
    nft: {
      fullDomain,
      domainType: 'organization_root',
      txSignature,
      assetId,
      snsAccountKey,
      status: 'confirmed',
    },
  });
}

// ─── GET /solana/resolve/:domain ────────────────────────

async function handleResolve(
  env: SolanaEnv,
  domain: string
): Promise<Response> {
  if (!domain) {
    return json({ error: 'Missing domain parameter' }, 400);
  }

  const snsConnection = getConnection(env);
  // Strip .sol suffix if present for SDK call
  const domainName = domain.replace(/\.sol$/, '');

  try {
    const owner = await resolve(snsConnection, domainName);
    return json({
      domain: `${domainName}.sol`,
      owner: owner.toBase58(),
    });
  } catch (err) {
    // Domain not found
    return json({
      domain: `${domainName}.sol`,
      owner: null,
      error: 'Domain not found',
    }, 404);
  }
}

// ─── POST /solana/revoke-subdomain ──────────────────────

async function handleRevokeSubdomain(
  request: Request,
  env: SolanaEnv
): Promise<Response> {
  parseClerkToken(request);

  const body: RevokeSubdomainBody = await request.json();
  const { fullDomain } = body;

  if (!fullDomain) {
    throw new Error('Missing fullDomain');
  }

  const connection = getConnection(env);
  const treasury = getTreasuryKeypair(env);
  const domainName = fullDomain.replace(/\.sol$/, '');

  console.log(`[solana/revoke-subdomain] Revoking: ${domainName}.sol → treasury`);

  try {
    const transferIx = await transferSubdomain(
      connection,
      `${domainName}.sol`,
      treasury.publicKey,
      true
    );

    const tx = new Transaction().add(transferIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [treasury]);

    console.log(`[solana/revoke-subdomain] Subdomain revoked. TX: ${sig}`);

    return json({
      success: true,
      message: `Subdomain ${fullDomain} revoked`,
      txSignature: sig,
    });
  } catch (err) {
    console.error('[solana/revoke-subdomain] Error:', err);
    throw new Error(`Failed to revoke subdomain: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

// ─── POST /solana/update-org-collection ──────────────────

async function handleUpdateOrgCollection(
  request: Request,
  env: SolanaEnv
): Promise<Response> {
  const clerkUserId = parseClerkToken(request);
  const body: UpdateOrgCollectionBody = await request.json();
  const { organizationId, name, logoUrl, description } = body;

  if (!organizationId) {
    throw new Error('Missing required field: organizationId');
  }

  const db = newSupabase(env);

  // Verify org membership (owner/admin)
  const membership = await db.selectOne<{ role: string }>(
    'organization_members',
    `organization_id=eq.${organizationId}&clerk_user_id=eq.${clerkUserId}&select=role`
  );
  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    throw new Error('Only organization owners/admins can update org collections');
  }

  // Look up org's collection address
  const org = await db.selectOne<{
    org_collection_address: string | null;
    slug: string;
    name: string;
  }>(
    'organizations', `id=eq.${organizationId}&select=org_collection_address,slug,name`
  );
  if (!org?.org_collection_address) {
    throw new Error('Organization does not have a collection yet — create org domain first');
  }

  const orgSubdomain = org.slug;

  // Update R2 metadata (merge with existing)
  const metadataKey = `metadata/cnfts/collection-${orgSubdomain}.json`;
  let existingMetadata: Record<string, unknown> = {};
  try {
    const existing = await env.R2_STORAGE.get(metadataKey);
    if (existing) {
      existingMetadata = await existing.json() as Record<string, unknown>;
    }
  } catch {
    // Start fresh if no existing metadata
  }

  const updatedMetadata = {
    ...existingMetadata,
    ...(name !== undefined ? { name: `${name} — BlockDrive` } : {}),
    ...(logoUrl !== undefined ? { image: logoUrl } : {}),
    ...(description !== undefined ? { description } : {}),
  };
  await storeMetadataInR2(env.R2_STORAGE, `collection-${orgSubdomain}`, updatedMetadata);

  // Update on-chain collection name if name was provided
  if (name) {
    try {
      const umi = getUmi(env);
      const collectionPubkey = umiPublicKey(org.org_collection_address);
      const collectionUri = buildMetadataUri(env, `collection-${orgSubdomain}`);

      await updateCollectionV1(umi, {
        collection: collectionPubkey,
        newName: `${name} — BlockDrive`,
        newUri: collectionUri,
      }).sendAndConfirm(umi);

      console.log(`[solana/update-org-collection] On-chain name updated for ${organizationId}`);
    } catch (err) {
      console.error('[solana/update-org-collection] On-chain update error:', err);
      throw new Error(`Failed to update on-chain collection: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  return json({
    success: true,
    message: 'Organization collection updated',
    collection: {
      address: org.org_collection_address,
      metadata: updatedMetadata,
    },
  });
}

// ─── Delete Org Assets (called by Clerk webhook) ────────

/**
 * Deletes all on-chain assets for an organization:
 * 1. Revoke member SNS subdomains back to treasury
 * 2. Revoke org root SNS subdomain
 * 3. Archive org MPL-Core collection
 * 4. Mark all org cNFTs for burn
 * 5. Clear FK references + delete org row
 * 6. Clean up R2 metadata
 *
 * Order matters: children before parent (FK constraints).
 * Both Worker and Edge Function handlers are idempotent.
 */
export async function deleteOrgAssets(
  env: SolanaEnv,
  clerkOrgId: string
): Promise<{
  orgId: string | null;
  memberSubdomainsRevoked: string[];
  rootDomainRevoked: string | null;
  nftsMarkedForBurn: number;
  collectionArchived: boolean;
  errors: string[];
}> {
  const db = newSupabase(env);
  const connection = getConnection(env);
  const treasury = getTreasuryKeypair(env);
  const memberSubdomainsRevoked: string[] = [];
  let rootDomainRevoked: string | null = null;
  let nftsMarkedForBurn = 0;
  let collectionArchived = false;
  const errors: string[] = [];

  // Step 1: Lookup org
  const org = await db.selectOne<{
    id: string;
    org_collection_address: string | null;
    name: string;
    slug: string;
  }>(
    'organizations',
    `clerk_org_id=eq.${clerkOrgId}&select=id,org_collection_address,name,slug`
  );

  if (!org) {
    console.log(`[delete-org-assets] No org found for clerk_org_id=${clerkOrgId} (already deleted?)`);
    return { orgId: null, memberSubdomainsRevoked, rootDomainRevoked, nftsMarkedForBurn, collectionArchived, errors };
  }

  const orgId = org.id;
  console.log(`[delete-org-assets] Deleting org ${orgId} (${org.slug})`);

  // Step 2: Fetch all org NFTs
  const nfts = await db.select<{
    id: string;
    full_domain: string;
    asset_id: string | null;
    sns_account_key: string | null;
    domain_type: string;
    mint_status: string;
  }>(
    'username_nfts',
    `organization_id=eq.${orgId}&mint_status=neq.deleted&select=id,full_domain,asset_id,sns_account_key,domain_type,mint_status`
  );

  // Step 3: Partition into member NFTs and root NFTs
  const memberNfts = nfts.filter(n => n.domain_type === 'organization');
  const rootNfts = nfts.filter(n => n.domain_type === 'organization_root');

  // Step 4: Revoke member SNS subdomains
  for (const nft of memberNfts) {
    if (!nft.full_domain) continue;
    try {
      const domainName = nft.full_domain.replace(/\.sol$/, '');
      const transferIx = await transferSubdomain(
        connection,
        `${domainName}.sol`,
        treasury.publicKey,
        true
      );
      const tx = new Transaction().add(transferIx);
      await sendAndConfirmTransaction(connection, tx, [treasury]);
      memberSubdomainsRevoked.push(nft.full_domain);
      console.log(`[delete-org-assets] Revoked member SNS: ${nft.full_domain}`);
    } catch (err) {
      const msg = `Member SNS revoke failed for ${nft.full_domain}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error(`[delete-org-assets] ${msg}`);
    }
  }

  // Step 5: Revoke org root SNS subdomain
  for (const nft of rootNfts) {
    if (!nft.full_domain) continue;
    try {
      const domainName = nft.full_domain.replace(/\.sol$/, '');
      const transferIx = await transferSubdomain(
        connection,
        `${domainName}.sol`,
        treasury.publicKey,
        true
      );
      const tx = new Transaction().add(transferIx);
      await sendAndConfirmTransaction(connection, tx, [treasury]);
      rootDomainRevoked = nft.full_domain;
      console.log(`[delete-org-assets] Revoked root SNS: ${nft.full_domain}`);
    } catch (err) {
      const msg = `Root SNS revoke failed for ${nft.full_domain}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error(`[delete-org-assets] ${msg}`);
    }
  }

  // Step 6: Archive org collection
  if (org.org_collection_address) {
    try {
      const umi = getUmi(env);
      const collectionPubkey = umiPublicKey(org.org_collection_address);

      await updateCollectionV1(umi, {
        collection: collectionPubkey,
        newName: `[ARCHIVED] ${org.name} — BlockDrive`,
        newUri: '',
      }).sendAndConfirm(umi);

      collectionArchived = true;
      console.log(`[delete-org-assets] Collection archived: ${org.org_collection_address}`);
    } catch (err) {
      const msg = `Collection archive failed: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error(`[delete-org-assets] ${msg}`);
    }
  }

  // Step 7: Mark all org NFTs as pending_burn and clear organization_id FK
  for (const nft of nfts) {
    try {
      const burnStatus = nft.asset_id ? 'pending_burn' : 'deleted';
      await db.update(
        'username_nfts',
        `id=eq.${nft.id}`,
        {
          mint_status: burnStatus,
          deleted_at: new Date().toISOString(),
          organization_id: null,
        }
      );
      nftsMarkedForBurn++;
    } catch (err) {
      const msg = `NFT status update failed for ${nft.id}: ${err instanceof Error ? err.message : 'Unknown'}`;
      errors.push(msg);
      console.error(`[delete-org-assets] ${msg}`);
    }
  }

  // Step 8: Clear org member FKs
  try {
    await db.update(
      'organization_members',
      `organization_id=eq.${orgId}`,
      { org_username: null, org_subdomain_nft_id: null }
    );
  } catch (err) {
    const msg = `Org member FK cleanup failed: ${err instanceof Error ? err.message : 'Unknown'}`;
    errors.push(msg);
    console.error(`[delete-org-assets] ${msg}`);
  }

  // Step 9: Delete organizations row (CASCADEs to members, invites, etc.)
  try {
    await db.delete('organizations', `id=eq.${orgId}`);
    console.log(`[delete-org-assets] Organizations row deleted: ${orgId}`);
  } catch (err) {
    const msg = `Organizations row delete failed: ${err instanceof Error ? err.message : 'Unknown'}`;
    errors.push(msg);
    console.error(`[delete-org-assets] ${msg}`);
  }

  // Step 10: Clean up R2 metadata (non-critical)
  const allDomains = nfts.map(n => n.full_domain).filter(Boolean);
  for (const domain of allDomains) {
    try {
      await env.R2_STORAGE.delete(`metadata/cnfts/${domain}.json`);
    } catch {
      // Non-critical — R2 cleanup is best-effort
    }
  }
  if (org.slug) {
    try {
      await env.R2_STORAGE.delete(`metadata/cnfts/collection-${org.slug}.json`);
    } catch {
      // Non-critical
    }
  }

  console.log(`[delete-org-assets] Done for ${clerkOrgId}: ${memberSubdomainsRevoked.length} members revoked, ${nftsMarkedForBurn} NFTs marked, ${errors.length} errors`);
  return { orgId, memberSubdomainsRevoked, rootDomainRevoked, nftsMarkedForBurn, collectionArchived, errors };
}

// ─── Delete User Assets (called by Clerk webhook) ───────

/**
 * Deletes all on-chain assets for a user:
 * 1. Revoke SNS subdomain(s) back to treasury
 * 2. Mark cNFT for burn (requires DAS RPC — queued if unavailable)
 * 3. Clean up DB records
 *
 * cNFT burn note: Bubblegum burnV2 requires a Merkle proof from a
 * DAS-compatible RPC (Helius, QuickNode, etc). If SOLANA_RPC_URL
 * doesn't support DAS, the burn is marked pending in the DB.
 * Soulbound cNFTs on dead wallets are harmless — they can't be
 * transferred. The SNS subdomain revocation is the critical step.
 */
export async function deleteUserAssets(
  env: SolanaEnv,
  clerkUserId: string
): Promise<{ revoked: string[]; burned: string[]; errors: string[] }> {
  const db = newSupabase(env);
  const connection = getConnection(env);
  const treasury = getTreasuryKeypair(env);
  const revoked: string[] = [];
  const burned: string[] = [];
  const errors: string[] = [];

  // Find all NFT records for this user
  const nfts = await db.select<{
    id: string;
    full_domain: string;
    asset_id: string | null;
    sns_account_key: string | null;
    mint_status: string;
  }>(
    'username_nfts',
    `clerk_user_id=eq.${clerkUserId}&mint_status=neq.deleted&select=id,full_domain,asset_id,sns_account_key,mint_status`
  );

  if (!nfts || nfts.length === 0) {
    console.log(`[delete-user-assets] No NFT records found for ${clerkUserId}`);
    return { revoked, burned, errors };
  }

  for (const nft of nfts) {
    // Step 1: Revoke SNS subdomain
    if (nft.full_domain) {
      try {
        const domainName = nft.full_domain.replace(/\.sol$/, '');
        const transferIx = await transferSubdomain(
          connection,
          `${domainName}.sol`,
          treasury.publicKey,
          true
        );
        const tx = new Transaction().add(transferIx);
        await sendAndConfirmTransaction(connection, tx, [treasury]);
        revoked.push(nft.full_domain);
        console.log(`[delete-user-assets] Revoked SNS: ${nft.full_domain}`);
      } catch (err) {
        const msg = `SNS revoke failed for ${nft.full_domain}: ${err instanceof Error ? err.message : 'Unknown'}`;
        errors.push(msg);
        console.error(`[delete-user-assets] ${msg}`);
      }
    }

    // Step 2: Mark cNFT for burn
    // Full burn requires DAS API proof — mark as pending_burn for now
    // When a DAS-compatible RPC is available, a batch job can process these
    const burnStatus = nft.asset_id ? 'pending_burn' : 'deleted';

    // Step 3: Update DB record
    try {
      await db.update(
        'username_nfts',
        `id=eq.${nft.id}`,
        {
          mint_status: burnStatus,
          deleted_at: new Date().toISOString(),
        }
      );
    } catch (err) {
      errors.push(`DB update failed for ${nft.id}`);
    }
  }

  // Clean up profile
  try {
    await db.update(
      'profiles',
      `clerk_user_id=eq.${clerkUserId}`,
      { username: null, sns_domain: null }
    );
  } catch (err) {
    errors.push('Profile cleanup failed');
  }

  // Clean up org member records
  try {
    await db.update(
      'organization_members',
      `clerk_user_id=eq.${clerkUserId}`,
      { org_username: null, org_subdomain_nft_id: null }
    );
  } catch (err) {
    errors.push('Org member cleanup failed');
  }

  console.log(`[delete-user-assets] Done for ${clerkUserId}: ${revoked.length} revoked, ${errors.length} errors`);
  return { revoked, burned, errors };
}
