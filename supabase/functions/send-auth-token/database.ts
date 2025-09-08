
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.50.0';
import { TokenRequest } from './types.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export const supabase = createClient(supabaseUrl, supabaseKey);

export const checkExistingToken = async (walletAddress: string, blockchainType: string) => {
  // Set operation context for service role access
  const { error: configError } = await supabase
    .rpc('set_config', {
      setting_name: 'app.auth_token_operation',
      new_value: 'duplicate_check',
      is_local: true
    });

  if (configError) {
    console.error('Failed to set operation context:', configError);
  }

  const { data: existingToken, error: checkError } = await supabase
    .from('auth_tokens')
    .select('id, wallet_address, blockchain_type, is_used, expires_at')
    .eq('wallet_address', walletAddress)
    .eq('blockchain_type', blockchainType)
    .eq('is_used', false)
    .maybeSingle();

  // Clear operation context
  await supabase.rpc('set_config', {
    setting_name: 'app.auth_token_operation',
    new_value: '',
    is_local: true
  });

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
  // Set operation context for service role access
  const { error: configError } = await supabase
    .rpc('set_config', {
      setting_name: 'app.auth_token_operation',
      new_value: 'token_creation',
      is_local: true
    });

  if (configError) {
    console.error('Failed to set operation context:', configError);
  }

  const { data, error } = await supabase
    .from('auth_tokens')
    .insert(tokenData)
    .select('id, expires_at, created_at')
    .single();

  // Clear operation context
  await supabase.rpc('set_config', {
    setting_name: 'app.auth_token_operation', 
    new_value: '',
    is_local: true
  });

  if (error) {
    throw new Error('Failed to store authentication token');
  }

  return data;
};
