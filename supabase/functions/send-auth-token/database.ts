
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.50.0';
import { TokenRequest } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export const checkExistingToken = async (walletAddress: string, blockchainType: string) => {
  const { data: existingToken, error: checkError } = await supabase
    .from('auth_tokens')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('blockchain_type', blockchainType)
    .eq('is_used', false)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error('Failed to check existing registration');
  }

  return existingToken;
};

export const storeToken = async (tokenData: {
  token: string;
  email: string;
  full_name: string;
  organization?: string;
  wallet_address: string;
  blockchain_type: string;
}) => {
  const { data, error } = await supabase
    .from('auth_tokens')
    .insert(tokenData)
    .select()
    .single();

  if (error) {
    throw new Error('Failed to store authentication token');
  }

  return data;
};
