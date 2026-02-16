/**
 * Create NFT Collection
 *
 * Creates a Crossmint NFT collection for either the global BlockDrive collection
 * or a per-organization collection.
 *
 * - Global: "BlockDrive Membership" collection (one-time setup)
 * - Organization: "{orgName} — BlockDrive" collection (per-org, uses org logo)
 *
 * Required env vars:
 * - CROSSMINT_SERVER_API_KEY
 * - CROSSMINT_ENVIRONMENT: 'staging' or 'www'
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - CROSSMINT_PROXY_URL (optional): Cloudflare Worker proxy for Crossmint minting API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getClerkUserId } from '../_shared/auth.ts';
import { getCrossmintMintingUrl } from '../_shared/crossmint.ts';

const BLOCKDRIVE_LOGO_URL = 'https://blockdrive.sol/logo.png';

interface CreateCollectionRequest {
  type: 'global' | 'organization';
  organizationId?: string;
  orgName?: string;
  orgSlug?: string;
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

    // Parse request body first (needed for auth decision)
    const {
      type,
      organizationId,
      orgName,
      orgSlug,
      logoUrl,
    }: CreateCollectionRequest = await req.json();

    // Authenticate (skip for global collection setup - one-time admin operation)
    let clerkUserId: string | null = null;
    try {
      clerkUserId = getClerkUserId(req);
    } catch (_authErr) {
      if (type !== 'global') throw _authErr;
      console.log('[create-nft-collection] Auth skipped for global collection setup');
    }

    if (!type || !['global', 'organization'].includes(type)) {
      throw new Error('Invalid type: must be "global" or "organization"');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // For global collections, check if one already exists in system_config
    if (type === 'global') {
      const { data: existing } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'global_nft_collection_id')
        .maybeSingle();

      if (existing?.value) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Global collection already exists',
            collectionId: existing.value,
            alreadyExists: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // For org collections, validate org exists and user is owner/admin
    if (type === 'organization') {
      if (!organizationId || !orgName || !orgSlug) {
        throw new Error('Missing required fields for organization collection: organizationId, orgName, orgSlug');
      }

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
        throw new Error('Only organization owners/admins can create NFT collections');
      }

      // Check if org already has a collection
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('nft_collection_id')
        .eq('id', organizationId)
        .single();

      if (existingOrg?.nft_collection_id) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Organization already has an NFT collection',
            collectionId: existingOrg.nft_collection_id,
            alreadyExists: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    // Build collection payload for Crossmint API
    const truncatedName = type === 'organization'
      ? `${orgName!.slice(0, 18)} — BlockDrive`.slice(0, 32)
      : 'BlockDrive Membership';

    const symbol = type === 'organization'
      ? `BD${orgSlug!.toUpperCase().slice(0, 6)}`
      : 'BDRIVE';

    const description = type === 'organization'
      ? `${orgName!.slice(0, 40)} member NFTs`.slice(0, 64)
      : 'BlockDrive membership and username NFTs';

    const imageUrl = logoUrl || BLOCKDRIVE_LOGO_URL;

    console.log(`[create-nft-collection] Creating ${type} collection: "${truncatedName}" (${symbol})`);

    const crossmintUrl = getCrossmintMintingUrl(crossmintEnv, 'collections/');

    const collectionPayload = {
      chain: 'solana',
      metadata: {
        name: truncatedName,
        symbol,
        description,
        imageUrl,
      },
    };

    console.log('[create-nft-collection] URL:', crossmintUrl);

    const createResponse = await fetch(crossmintUrl, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': crossmintApiKey,
      },
      body: JSON.stringify(collectionPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[create-nft-collection] Crossmint API error (status', createResponse.status, '):', errorText);
      throw new Error(`Crossmint collection creation failed (${createResponse.status}): ${errorText}`);
    }

    const collectionResult = await createResponse.json();
    const collectionId = collectionResult.id;

    console.log(`[create-nft-collection] Collection created: ${collectionId}`);

    // Store the collection ID
    if (type === 'global') {
      const { error: upsertError } = await supabase
        .from('system_config')
        .upsert({
          key: 'global_nft_collection_id',
          value: collectionId,
          updated_at: new Date().toISOString(),
        });

      if (upsertError) {
        console.error('[create-nft-collection] Failed to store global collection ID:', upsertError);
      } else {
        console.log(`[create-nft-collection] Global collection ID stored in system_config: ${collectionId}`);
      }
    } else if (type === 'organization') {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          nft_collection_id: collectionId,
          nft_collection_created_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (updateError) {
        console.error('[create-nft-collection] Failed to update org record:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        collectionId,
        type,
        name: truncatedName,
        symbol,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[create-nft-collection] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create NFT collection',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
