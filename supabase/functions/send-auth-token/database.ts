
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

  // Use the secure function to check token existence
  const { data: checkResult, error: checkError } = await supabase
    .rpc('check_token_exists_secure', {
      wallet_address_param: walletAddress,
      blockchain_type_param: blockchainType
    });

  // Clear operation context
  await supabase.rpc('set_config', {
    setting_name: 'app.auth_token_operation',
    new_value: '',
    is_local: true
  });

  if (checkError) {
    throw new Error('Failed to check existing registration');
  }

  return checkResult?.exists ? { exists: true } : null;
};

export const storeToken = async (tokenData: {
  token: string;
  email: string;
  full_name: string;
  organization?: string;
  wallet_address: string;
  blockchain_type: string;
}) => {
  // Use the secure function to store tokens
  const { data, error } = await supabase
    .rpc('store_token_secure', {
      token_param: tokenData.token,
      email_param: tokenData.email,
      full_name_param: tokenData.full_name,
      organization_param: tokenData.organization,
      wallet_address_param: tokenData.wallet_address,
      blockchain_type_param: tokenData.blockchain_type
    });

  if (error) {
    throw new Error('Failed to store authentication token');
  }

  return data;
};
