/**
 * Username NFT Service
 *
 * Handles minting BlockDrive username subdomain NFTs via Crossmint.
 * Mints compressed NFTs on Solana for cost efficiency.
 *
 * Flow:
 * 1. User selects username during signup
 * 2. Frontend calls this service with username
 * 3. Service calls Supabase Edge Function
 * 4. Edge Function calls Crossmint API to mint compressed NFT
 * 5. NFT is minted to user's Crossmint wallet
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
  clerkUserId: string;
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
  actionId?: string;
  crossmintId?: string;
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
 * This mints a compressed NFT on Solana via Crossmint.
 * - Individual users: {username}.blockdrive.sol
 * - Organization users: {username}.{org}.blockdrive.sol
 */
export async function mintUsernameNFT(params: MintUsernameNFTParams): Promise<MintUsernameNFTResult> {
  const {
    clerkUserId,
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

    console.log(`[usernameNFT] Minting ${fullDomain} for user ${clerkUserId}`);
    if (isOrgDomain) {
      console.log(`[usernameNFT] Organization context: ${organizationId} (${organizationSubdomain})`);
    }

    // Call edge function to mint NFT
    const response = await supabase.functions.invoke('mint-username-nft', {
      body: {
        clerkUserId,
        username: normalized,
        recipientEmail,
        recipientWalletAddress,
        // Organization context
        organizationId,
        organizationSubdomain,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.error) {
      console.error('[usernameNFT] Edge function error:', response.error);
      return { success: false, error: response.error.message || 'Failed to mint username NFT' };
    }

    const data = response.data;

    if (!data.success) {
      return { success: false, error: data.error || 'Minting failed' };
    }

    console.log('[usernameNFT] Mint successful:', data);

    return {
      success: true,
      username: data.nft.username,
      fullDomain: data.nft.fullDomain,
      actionId: data.nft.actionId,
      crossmintId: data.nft.crossmintId,
      status: data.nft.status,
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
export async function getUsernameNFT(clerkUserId: string): Promise<{
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
      .eq('clerk_user_id', clerkUserId)
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
 * Check mint status via Crossmint API
 * Can be used to poll for completion
 */
export async function checkMintStatus(actionId: string): Promise<{
  status: string;
  completed: boolean;
  tokenId?: string;
  error?: string;
}> {
  try {
    // This would need to call a backend endpoint that checks Crossmint
    // For now, return pending - the webhook will update the status
    return {
      status: 'pending',
      completed: false,
    };
  } catch (error) {
    console.error('[usernameNFT] Status check error:', error);
    return {
      status: 'unknown',
      completed: false,
      error: 'Failed to check mint status',
    };
  }
}
