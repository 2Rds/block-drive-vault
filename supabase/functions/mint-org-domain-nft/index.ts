/**
 * Mint Organization Domain NFT
 *
 * Mints the org's root domain NFT (e.g. "acme.blockdrive.sol") to the
 * org creator's embedded wallet. Uses the global BlockDrive collection.
 *
 * Called after org creation + collection creation succeeds.
 *
 * Required env vars:
 * - CROSSMINT_SERVER_API_KEY
 * - CROSSMINT_ENVIRONMENT: 'staging' or 'www'
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Global collection ID is read from system_config table (set by create-nft-collection).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getClerkUserId } from '../_shared/auth.ts';

const BLOCKDRIVE_LOGO_URL = 'https://blockdrive.sol/logo.png';

interface MintOrgDomainNFTRequest {
  organizationId: string;
  orgName: string;
  orgSubdomain: string;
  logoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const crossmintApiKey = Deno.env.get('CROSSMINT_SERVER_API_KEY');
    const crossmintEnv = Deno.env.get('CROSSMINT_ENVIRONMENT') || 'staging';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!crossmintApiKey) {
      throw new Error('CROSSMINT_SERVER_API_KEY not configured');
    }

    // Authenticate
    const clerkUserId = getClerkUserId(req);

    // Parse request
    const {
      organizationId,
      orgName,
      orgSubdomain,
      logoUrl,
    }: MintOrgDomainNFTRequest = await req.json();

    if (!organizationId || !orgName || !orgSubdomain) {
      throw new Error('Missing required fields: organizationId, orgName, orgSubdomain');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is the org owner/admin
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (membershipError || !membership) {
      throw new Error('You must be a member of the organization');
    }

    if (!['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization owners/admins can mint org domain NFTs');
    }

    // Check if org domain NFT already exists
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('org_nft_mint')
      .eq('id', organizationId)
      .single();

    if (existingOrg?.org_nft_mint) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Organization domain NFT already minted',
          nftId: existingOrg.org_nft_mint,
          alreadyExists: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get the org creator's wallet address
    const { data: wallet, error: walletError } = await supabase
      .from('crossmint_wallets')
      .select('wallet_address')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (walletError || !wallet?.wallet_address) {
      throw new Error('No wallet found for org creator. Wallet must be created first.');
    }

    // Resolve global collection ID from system_config (set by create-nft-collection)
    const { data: configRow } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'global_nft_collection_id')
      .maybeSingle();

    const globalCollectionId = configRow?.value || Deno.env.get('CROSSMINT_GLOBAL_COLLECTION_ID');
    if (!globalCollectionId) {
      throw new Error('Global NFT collection not created yet. Call create-nft-collection with type "global" first.');
    }

    const fullDomain = `${orgSubdomain.toLowerCase()}.blockdrive.sol`;

    console.log(`[mint-org-domain-nft] Minting "${fullDomain}" to wallet ${wallet.wallet_address}`);

    // Build NFT metadata
    const nftMetadata = {
      name: fullDomain,
      description: `Organization domain NFT for ${orgName}`,
      image: logoUrl || BLOCKDRIVE_LOGO_URL,
      attributes: [
        { trait_type: 'Organization', value: orgName },
        { trait_type: 'Subdomain', value: orgSubdomain.toLowerCase() },
        { trait_type: 'Full Domain', value: fullDomain },
        { trait_type: 'Domain Type', value: 'organization_root' },
        { trait_type: 'Created', value: new Date().toISOString() },
      ],
    };

    // Mint via Crossmint API using global collection
    const crossmintUrl = `https://${crossmintEnv}.crossmint.com/api/2022-06-09/collections/${globalCollectionId}/nfts`;

    const mintResponse = await fetch(crossmintUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': crossmintApiKey,
      },
      body: JSON.stringify({
        recipient: `solana:${wallet.wallet_address}`,
        metadata: nftMetadata,
        compressed: true,
        reuploadLinkedFiles: false,
      }),
    });

    if (!mintResponse.ok) {
      const errorText = await mintResponse.text();
      console.error('[mint-org-domain-nft] Crossmint API error:', errorText);
      throw new Error(`Crossmint minting failed: ${errorText}`);
    }

    const mintResult = await mintResponse.json();
    console.log('[mint-org-domain-nft] Crossmint response:', mintResult);

    // Update organizations table with NFT reference
    const { error: updateOrgError } = await supabase
      .from('organizations')
      .update({ org_nft_mint: mintResult.actionId || mintResult.id })
      .eq('id', organizationId);

    if (updateOrgError) {
      console.error('[mint-org-domain-nft] Failed to update org record:', updateOrgError);
    }

    // Get org creator's profile ID for the username_nfts record
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    // Record in username_nfts table
    const { error: insertError } = await supabase
      .from('username_nfts')
      .insert({
        user_id: profile?.id || null,
        clerk_user_id: clerkUserId,
        username: orgSubdomain.toLowerCase(),
        full_domain: fullDomain,
        crossmint_action_id: mintResult.actionId,
        crossmint_nft_id: mintResult.id,
        mint_status: mintResult.onChain?.status || 'pending',
        chain: 'solana',
        recipient_address: wallet.wallet_address,
        metadata: nftMetadata,
        organization_id: organizationId,
        domain_type: 'organization_root',
        parent_domain: 'blockdrive.sol',
      });

    if (insertError) {
      console.error('[mint-org-domain-nft] DB insert error:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully minted ${fullDomain} domain NFT`,
        nft: {
          fullDomain,
          domainType: 'organization_root',
          actionId: mintResult.actionId,
          crossmintId: mintResult.id,
          status: mintResult.onChain?.status || 'pending',
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[mint-org-domain-nft] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to mint org domain NFT',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
