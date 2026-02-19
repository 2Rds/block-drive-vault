/**
 * Username NFT Service
 *
 * Handles minting BlockDrive username subdomain NFTs via Solana native operations.
 * Creates SNS subdomains + soulbound Bubblegum V2 compressed NFTs.
 *
 * Flow:
 * 1. User selects username during signup
 * 2. Frontend calls this service with username
 * 3. Service calls API gateway (Cloudflare Worker at user's nearest POP)
 * 4. Gateway creates SNS subdomain + mints soulbound cNFT on Solana
 * 5. NFT is minted to user's wallet, subdomain resolves on-chain
 */

import { supabase } from '@/integrations/supabase/client';

// Username validation constants
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 20;
const USERNAME_PATTERN = /^[a-z0-9_]+$/;
const RESERVED_USERNAMES = [
  'admin', 'blockdrive', 'system', 'support',
  'help', 'api', 'www', 'mail', 'ftp'
] as const;

// Domain suffix
const DOMAIN_SUFFIX = 'blockdrive.sol';

interface MintUsernameNFTParams {
  userId: string;
  username: string;
  recipientEmail?: string;
  recipientWalletAddress?: string;
  token: string;
  // Organization context (optional)
  organizationId?: string;
  organizationSubdomain?: string;
}

interface MintUsernameNFTResult {
  success: boolean;
  username?: string;
  fullDomain?: string;
  txSignature?: string;
  assetId?: string;
  snsAccountKey?: string;
  status?: string;
  error?: string;
}

interface UsernameAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Validate username format
 * - 3-20 characters
 * - Alphanumeric and underscores only
 * - Lowercase
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  const normalized = username.toLowerCase().trim();

  if (normalized.length < MIN_USERNAME_LENGTH) {
    return { valid: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters` };
  }

  if (normalized.length > MAX_USERNAME_LENGTH) {
    return { valid: false, error: `Username must be ${MAX_USERNAME_LENGTH} characters or less` };
  }

  if (!USERNAME_PATTERN.test(normalized)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (RESERVED_USERNAMES.includes(normalized as typeof RESERVED_USERNAMES[number])) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResult> {
  try {
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    const normalized = username.toLowerCase().trim();

    // Call database function to check availability
    const { data, error } = await supabase.rpc('check_username_available', {
      p_username: normalized,
    });

    if (error) {
      console.error('[usernameNFT] Availability check error:', error);
      return { available: false, error: 'Failed to check username availability' };
    }

    return { available: data === true };
  } catch (error) {
    console.error('[usernameNFT] Availability check error:', error);
    return { available: false, error: 'Failed to check username availability' };
  }
}

/**
 * Mint a username NFT for the user
 *
 * This mints a compressed NFT on Solana via the API gateway.
 * - Individual users: {username}.blockdrive.sol
 * - Organization users: {username}.{org}.blockdrive.sol
 */
export async function mintUsernameNFT(params: MintUsernameNFTParams): Promise<MintUsernameNFTResult> {
  const {
    userId,
    username,
    recipientEmail,
    recipientWalletAddress,
    token,
    organizationId,
    organizationSubdomain,
  } = params;

  try {
    // Validate username
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const normalized = username.toLowerCase().trim();
    const isOrgDomain = !!(organizationId && organizationSubdomain);
    const fullDomain = isOrgDomain
      ? `${normalized}.${organizationSubdomain.toLowerCase()}.${DOMAIN_SUFFIX}`
      : `${normalized}.${DOMAIN_SUFFIX}`;

    // Call API gateway for minting (runs at user's nearest Cloudflare POP)
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      return { success: false, error: 'VITE_WORKER_URL not configured' };
    }

    const response = await fetch(`${workerUrl}/solana/onboard-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        username: normalized,
        recipientWalletAddress,
        organizationId,
        organizationSubdomain,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || 'Minting failed' };
    }

    return {
      success: true,
      username: data.nft.username,
      fullDomain: data.nft.fullDomain,
      txSignature: data.nft.txSignature,
      assetId: data.nft.assetId,
      snsAccountKey: data.nft.snsAccountKey,
      status: data.nft.status, // 'confirmed' immediately (not 'pending')
    };
  } catch (error) {
    console.error('[usernameNFT] Mint error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mint username NFT',
    };
  }
}

/**
 * Get the user's username NFT if they have one
 */
export async function getUsernameNFT(userId: string): Promise<{
  hasNFT: boolean;
  username?: string;
  fullDomain?: string;
  status?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('username_nfts')
      .select('username, full_domain, mint_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[usernameNFT] Fetch error:', error);
      return { hasNFT: false, error: 'Failed to fetch username NFT' };
    }

    if (!data) {
      return { hasNFT: false };
    }

    return {
      hasNFT: true,
      username: data.username,
      fullDomain: data.full_domain,
      status: data.mint_status,
    };
  } catch (error) {
    console.error('[usernameNFT] Fetch error:', error);
    return { hasNFT: false, error: 'Failed to fetch username NFT' };
  }
}

/**
 * Resolve an SNS domain to its owner address
 */
export async function resolveSNSDomain(domain: string): Promise<{
  domain: string;
  owner: string | null;
  error?: string;
}> {
  try {
    const workerUrl = import.meta.env.VITE_WORKER_URL;
    if (!workerUrl) {
      return { domain, owner: null, error: 'VITE_WORKER_URL not configured' };
    }

    const response = await fetch(`${workerUrl}/solana/resolve/${encodeURIComponent(domain)}`);
    const data = await response.json();

    return {
      domain: data.domain || domain,
      owner: data.owner || null,
      error: data.error,
    };
  } catch (error) {
    console.error('[usernameNFT] Resolve error:', error);
    return { domain, owner: null, error: 'Failed to resolve domain' };
  }
}
