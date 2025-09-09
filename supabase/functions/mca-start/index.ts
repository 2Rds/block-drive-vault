import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface StartRequest {
  label: string;
  sol_pubkey?: string;
  evm_addr?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { label, sol_pubkey, evm_addr }: StartRequest = await req.json();

    if (!label || !sol_pubkey || !evm_addr) {
      return new Response(
        JSON.stringify({ error: 'Label, sol_pubkey, and evm_addr are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate the subdomain name format
    const labelRegex = /^[a-z0-9-]+$/;
    if (!labelRegex.test(label)) {
      return new Response(
        JSON.stringify({ error: 'Invalid label format. Use only lowercase letters, numbers, and hyphens.' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate a challenge
    const challenge = {
      version: "mca-1",
      label,
      domain: "blockdrive",
      sol_pubkey,
      evm_addr,
      chains: ["solana:mainnet", "eip155:8453"], // Solana mainnet and Base
      aud: "blockdrive",
      nonce: crypto.randomUUID(),
      issuedAt: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({ challenge }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error in mca-start:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});