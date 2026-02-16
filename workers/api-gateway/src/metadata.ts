/**
 * cNFT Metadata Endpoint
 *
 * Serves metadata JSON for Bubblegum V2 compressed NFTs.
 * URI format: GET /metadata/cnft/{fullDomain}
 *
 * Resolution order:
 * 1. R2 storage (metadata/cnfts/{fullDomain}.json) — immutable cache
 * 2. DB fallback (username_nfts.metadata JSONB column)
 */

import { SupabaseClient } from './supabase';

export interface MetadataEnv {
  R2_STORAGE: R2Bucket;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export async function handleMetadataRequest(
  request: Request,
  env: MetadataEnv,
  url: URL
): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Extract fullDomain from /metadata/cnft/{fullDomain}
  const match = url.pathname.match(/^\/metadata\/cnft\/(.+)$/);
  if (!match) {
    return new Response(JSON.stringify({ error: 'Invalid metadata path' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fullDomain = decodeURIComponent(match[1]!);

  // Try R2 first (pre-stored during mint)
  const r2Key = `metadata/cnfts/${fullDomain}.json`;
  const r2Object = await env.R2_STORAGE.get(r2Key);

  if (r2Object) {
    return new Response(r2Object.body, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'ETag': r2Object.httpEtag,
      },
    });
  }

  // Fallback: build from DB
  try {
    const db = new SupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const nft = await db.selectOne<{ metadata: Record<string, unknown>; full_domain: string }>(
      'username_nfts',
      `full_domain=eq.${fullDomain}&select=metadata,full_domain`
    );

    if (!nft?.metadata) {
      return new Response(JSON.stringify({ error: 'Metadata not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(nft.metadata), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[metadata] DB fallback error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
