import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { jsonResponse, errorResponse, handleCors } from '../_shared/response.ts';
import { HTTP_STATUS, LABEL_PATTERN } from '../_shared/constants.ts';

interface StartRequest {
  label: string;
  sol_pubkey?: string;
  evm_addr?: string;
}

const SUPPORTED_CHAINS = ["solana:mainnet", "eip155:8453"];

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return new Response('ok', { headers: corsHeaders });

  try {
    const { label, sol_pubkey, evm_addr }: StartRequest = await req.json();

    if (!label || !sol_pubkey || !evm_addr) {
      return errorResponse('Label, sol_pubkey, and evm_addr are required', HTTP_STATUS.BAD_REQUEST);
    }

    const labelRegex = /^[a-z0-9-]+$/;
    if (!labelRegex.test(label)) {
      return errorResponse('Invalid label format. Use only lowercase letters, numbers, and hyphens.', HTTP_STATUS.BAD_REQUEST);
    }

    const challenge = {
      version: "mca-1",
      label,
      domain: "blockdrive",
      sol_pubkey,
      evm_addr,
      chains: SUPPORTED_CHAINS,
      aud: "blockdrive",
      nonce: crypto.randomUUID(),
      issuedAt: new Date().toISOString()
    };

    return jsonResponse({ challenge });
  } catch (error) {
    console.error('Error in mca-start:', error);
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
});
