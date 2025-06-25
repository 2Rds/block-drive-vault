
import { User, Session } from '@supabase/supabase-js';

export interface WalletData {
  address: string | null;
  publicKey: any | null;
  adapter: any | null;
  connected: boolean;
  autoConnect: boolean;
  id: string | null;
  wallet_address: string;
  blockchain_type: string;
  blockchain_tokens?: Array<{
    token_id: string;
    blockchain_type: string;
    is_active: boolean;
    token_metadata?: any;
  }>;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  walletData: WalletData | null;
  setWalletData: (data: WalletData) => void;
  connectWallet: (walletAddress: string, signature: string, blockchainType: 'solana' | 'ethereum') => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}
