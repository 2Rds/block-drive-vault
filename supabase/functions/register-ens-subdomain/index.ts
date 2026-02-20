/**
 * Register ENS Subdomain Edge Function
 *
 * Server-side Namestone API call to register `username.blockdrive.eth`.
 * Sets the address record to the user's EVM wallet.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/response.ts";
import { getSupabaseServiceClient, getUserId } from "../_shared/auth.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger('REGISTER-ENS');

const NAMESTONE_API_URL = 'https://namestone.xyz/api/public_v1';
const ENS_PARENT_DOMAIN = 'blockdrive.eth';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const userId = getUserId(req);
    const body = await req.json();
    const { username, evmAddress } = body;

    if (!username || !evmAddress) {
      return errorResponse('Missing username or evmAddress', 400);
    }

    // Validate username format
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return errorResponse('Invalid username format', 400);
    }

    // Validate EVM address
    if (!/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
      return errorResponse('Invalid EVM address', 400);
    }

    const namestoneApiKey = Deno.env.get('NAMESTONE_API_KEY');
    if (!namestoneApiKey) {
      return errorResponse('Namestone API key not configured', 500);
    }

    log('Registering ENS subdomain', { username, evmAddress: evmAddress.slice(0, 10) + '...' });

    // Check if name is already taken
    const checkRes = await fetch(
      `${NAMESTONE_API_URL}/get-names?domain=${ENS_PARENT_DOMAIN}&name=${username}`,
      {
        headers: { Authorization: namestoneApiKey },
      },
    );

    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (Array.isArray(existing) && existing.length > 0) {
        return errorResponse('ENS subdomain already taken', 409);
      }
    }

    // Register the subdomain via Namestone
    const registerRes = await fetch(`${NAMESTONE_API_URL}/set-name`, {
      method: 'POST',
      headers: {
        Authorization: namestoneApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: ENS_PARENT_DOMAIN,
        name: username,
        address: evmAddress,
        text_records: {
          description: `BlockDrive user: ${username}`,
          url: `https://blockdrive.co/u/${username}`,
        },
      }),
    });

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      log('Namestone registration failed', { status: registerRes.status, error: errText });
      return errorResponse(`ENS registration failed: ${errText}`, 502);
    }

    const fullName = `${username}.${ENS_PARENT_DOMAIN}`;

    // Store ENS name in user profile
    const supabase = getSupabaseServiceClient();
    const { error: upsertError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          ens_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      log('Failed to save ENS name to user_profiles', { error: upsertError.message });
      // Non-fatal — ENS registration still succeeded on Namestone
    }

    log('ENS subdomain registered', { fullName });

    return jsonResponse({
      ensName: fullName,
      address: evmAddress,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log('Error', { error: message });
    return errorResponse(message, 500);
  }
});
