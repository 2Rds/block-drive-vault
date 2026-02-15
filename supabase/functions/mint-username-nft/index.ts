/**
 * Mint Username Subdomain NFT
 *
 * Mints a compressed NFT on Solana representing the user's username subdomain.
 *
 * Supports two domain types:
 * - Individual: "demo" -> "demo.blockdrive.sol" NFT
 * - Organization: "demo" + org "acme" -> "demo.acme.blockdrive.sol" NFT
 *
 * Uses Crossmint API for minting to the user's embedded wallet.
 *
 * Required env vars:
 * - CROSSMINT_SERVER_API_KEY: Server-side API key (sk_staging_... or sk_production_...)
 * - CROSSMINT_ENVIRONMENT: 'staging' or 'www' (production)
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Global BlockDrive NFT Collection ID (fallback if env var not set)
const FALLBACK_COLLECTION_ID = '789d9f7f-15ae-40d9-8854-00890ef7db1e';

interface MintUsernameNFTRequest {
  clerkUserId: string;
  username: string;
  recipientEmail: string;
  recipientWalletAddress?: string;
  // Organization context (optional)
  organizationId?: string;
  organizationSubdomain?: string;
}

interface CrossmintMintResponse {
  id: string;
  actionId: string;
  onChain: {
    status: string;
    chain: string;
    contractAddress?: string;
    tokenId?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const crossmintApiKey = Deno.env.get('CROSSMINT_SERVER_API_KEY');
    const crossmintEnv = Deno.env.get('CROSSMINT_ENVIRONMENT') || 'staging';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!crossmintApiKey) {
      throw new Error('CROSSMINT_SERVER_API_KEY not configured');
    }

    // Parse request
    const {
      clerkUserId,
      username,
      recipientEmail,
      recipientWalletAddress,
      organizationId,
      organizationSubdomain,
    }: MintUsernameNFTRequest = await req.json();

    // Validate required fields
    if (!clerkUserId || !username) {
      throw new Error('Missing required fields: clerkUserId and username');
    }

    // Determine if this is an organization subdomain
    const isOrgDomain = !!(organizationId && organizationSubdomain);
    const domainType = isOrgDomain ? 'organization' : 'individual';

    // Build the full domain based on context
    const fullDomain = isOrgDomain
      ? `${username.toLowerCase()}.${organizationSubdomain.toLowerCase()}.blockdrive.sol`
      : `${username.toLowerCase()}.blockdrive.sol`;

    const parentDomain = isOrgDomain
      ? `${organizationSubdomain.toLowerCase()}.blockdrive.sol`
      : 'blockdrive.sol';

    console.log(`[mint-username-nft] Domain type: ${domainType}, Full domain: ${fullDomain}`);

    // Validate username format (alphanumeric, lowercase, 3-20 chars)
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      throw new Error('Invalid username format. Must be 3-20 characters, alphanumeric and underscores only.');
    }

    // Verify Clerk JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const tokenUserId = payload.sub;

    if (tokenUserId !== clerkUserId) {
      throw new Error('User ID mismatch - unauthorized');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if username/domain is already taken
    // For org domains, check full_domain uniqueness
    // For individual domains, check username uniqueness
    let existingCheck;
    if (isOrgDomain) {
      // Check if this exact full domain exists
      const { data, error } = await supabase
        .from('username_nfts')
        .select('full_domain')
        .eq('full_domain', fullDomain)
        .maybeSingle();
      existingCheck = { data, error };
    } else {
      // Check if username exists as individual domain
      const { data, error } = await supabase
        .from('username_nfts')
        .select('username')
        .eq('username', username.toLowerCase())
        .is('organization_id', null)
        .maybeSingle();
      existingCheck = { data, error };
    }

    if (existingCheck.error && existingCheck.error.code !== 'PGRST116') {
      console.error('Error checking username:', existingCheck.error);
      throw new Error('Failed to check username availability');
    }

    if (existingCheck.data) {
      throw new Error(`Domain "${fullDomain}" is already taken`);
    }

    // If org domain, verify organization exists and user is a member
    if (isOrgDomain) {
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('clerk_user_id', clerkUserId)
        .maybeSingle();

      if (membershipError || !membership) {
        throw new Error('You must be a member of the organization to mint an org subdomain');
      }

      // Check if user already has an org username for this org
      const { data: existingOrgUsername } = await supabase
        .from('organization_members')
        .select('org_username')
        .eq('organization_id', organizationId)
        .eq('clerk_user_id', clerkUserId)
        .not('org_username', 'is', null)
        .maybeSingle();

      if (existingOrgUsername?.org_username) {
        throw new Error(`You already have an organization username: ${existingOrgUsername.org_username}.${organizationSubdomain}.blockdrive.sol`);
      }
    }

    // Get user's wallet from crossmint_wallets table (created during wallet step)
    const { data: crossmintWallet, error: walletError } = await supabase
      .from('crossmint_wallets')
      .select('wallet_address, email')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (walletError) {
      console.error('Wallet lookup error:', walletError);
    }

    // Get user profile (optional - may not exist for OAuth users)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile lookup error:', profileError);
    }

    // If no profile exists, create a minimal one for new OAuth users
    let profileId = profile?.id;
    if (!profile) {
      console.log('[mint-username-nft] No profile found, creating minimal profile for OAuth user');
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          email: recipientEmail || crossmintWallet?.email || null,
          username: username.toLowerCase(),
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Profile creation error:', createError);
        // Continue without profile ID - will use clerkUserId for tracking
      } else {
        profileId = newProfile?.id;
      }
    }

    // Determine recipient for minting
    // Priority: wallet address > userId (for external auth projects)
    // For projects with external auth (Custom JWT), Crossmint requires userId: format
    let recipient: string;
    const walletAddress = recipientWalletAddress || crossmintWallet?.wallet_address;

    if (walletAddress) {
      recipient = `solana:${walletAddress}`;
      console.log('[mint-username-nft] Using wallet address for recipient:', walletAddress);
    } else {
      // Use userId format for external auth projects (required by Crossmint)
      recipient = `userId:${clerkUserId}:solana`;
      console.log('[mint-username-nft] Using userId for recipient:', clerkUserId);
    }

    console.log(`[mint-username-nft] Minting "${fullDomain}" to ${recipient}`);

    // Build NFT metadata with organization support
    const nftMetadata = {
      name: fullDomain,
      description: isOrgDomain
        ? `BlockDrive organization username NFT for ${username} in ${organizationSubdomain}. This NFT represents ownership of the ${fullDomain} subdomain.`
        : `BlockDrive username NFT for ${username}. This NFT represents ownership of the ${fullDomain} subdomain on the Solana Name Service.`,
      image: isOrgDomain
        ? `https://blockdrive.sol/api/username-nft-image/${organizationSubdomain}/${username}`
        : `https://blockdrive.sol/api/username-nft-image/${username}`,
      attributes: [
        { trait_type: 'Username', value: username },
        { trait_type: 'Domain', value: parentDomain },
        { trait_type: 'Full Domain', value: fullDomain },
        { trait_type: 'Domain Type', value: domainType },
        ...(isOrgDomain ? [
          { trait_type: 'Organization', value: organizationSubdomain },
          { trait_type: 'Organization ID', value: organizationId },
        ] : []),
        { trait_type: 'Created', value: new Date().toISOString() },
      ],
    };

    // Determine which collection to mint into
    // Priority: system_config DB row > env var > hardcoded fallback
    let globalCollectionId = FALLBACK_COLLECTION_ID;
    const { data: configRow } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'global_nft_collection_id')
      .maybeSingle();

    if (configRow?.value) {
      globalCollectionId = configRow.value;
    } else if (Deno.env.get('CROSSMINT_GLOBAL_COLLECTION_ID')) {
      globalCollectionId = Deno.env.get('CROSSMINT_GLOBAL_COLLECTION_ID')!;
    }

    let collectionId = globalCollectionId;

    if (isOrgDomain && organizationId) {
      // For org member NFTs, use the org's dedicated collection if available
      const { data: orgRecord } = await supabase
        .from('organizations')
        .select('nft_collection_id')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgRecord?.nft_collection_id) {
        collectionId = orgRecord.nft_collection_id;
        console.log(`[mint-username-nft] Using org collection: ${collectionId}`);
      } else {
        console.log('[mint-username-nft] Org has no collection, using global collection');
      }
    }

    // Call Crossmint API to mint compressed NFT
    const crossmintUrl = `https://${crossmintEnv}.crossmint.com/api/2022-06-09/collections/${collectionId}/nfts`;

    const mintResponse = await fetch(crossmintUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': crossmintApiKey,
      },
      body: JSON.stringify({
        recipient,
        metadata: nftMetadata,
        compressed: true,
        reuploadLinkedFiles: false,
      }),
    });

    if (!mintResponse.ok) {
      const errorText = await mintResponse.text();
      console.error('[mint-username-nft] Crossmint API error:', errorText);
      throw new Error(`Crossmint minting failed: ${errorText}`);
    }

    const mintResult: CrossmintMintResponse = await mintResponse.json();
    console.log('[mint-username-nft] Crossmint response:', mintResult);

    // Store the username NFT record in Supabase
    const { data: nftRecord, error: insertError } = await supabase
      .from('username_nfts')
      .insert({
        user_id: profileId || null,
        clerk_user_id: clerkUserId,
        username: username.toLowerCase(),
        full_domain: fullDomain,
        crossmint_action_id: mintResult.actionId,
        crossmint_nft_id: mintResult.id,
        mint_status: mintResult.onChain?.status || 'pending',
        chain: 'solana',
        recipient_address: walletAddress || null,
        recipient_email: recipientEmail || crossmintWallet?.email || profile?.email || null,
        metadata: nftMetadata,
        // Organization fields
        organization_id: organizationId || null,
        domain_type: domainType,
        parent_domain: parentDomain,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[mint-username-nft] Database insert error:', insertError);
      // Don't throw - the NFT was minted, just DB record failed
    }

    // If org domain, update the organization_members record with org_username
    if (isOrgDomain && nftRecord) {
      const { error: updateError } = await supabase
        .from('organization_members')
        .update({
          org_username: username.toLowerCase(),
          org_subdomain_nft_id: nftRecord.id,
        })
        .eq('organization_id', organizationId)
        .eq('clerk_user_id', clerkUserId);

      if (updateError) {
        console.error('[mint-username-nft] Failed to update org member record:', updateError);
      }
    }

    // Update user profile with username (for individual domains only)
    // Org users keep their individual domain separate
    if (!isOrgDomain) {
      await supabase
        .from('profiles')
        .update({
          username: username.toLowerCase(),
          sns_domain: fullDomain,
        })
        .eq('clerk_user_id', clerkUserId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully minted ${fullDomain} NFT`,
        nft: {
          username: username.toLowerCase(),
          fullDomain,
          domainType,
          parentDomain,
          organizationId: organizationId || null,
          organizationSubdomain: organizationSubdomain || null,
          actionId: mintResult.actionId,
          crossmintId: mintResult.id,
          status: mintResult.onChain?.status || 'pending',
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[mint-username-nft] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to mint username NFT',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
