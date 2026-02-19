
import { User, Session } from '@supabase/supabase-js';

export interface WalletData {
  address: string | null;
  wallet_address: string;
  blockchain_type: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  walletData: WalletData | null;
  setWalletData: (data: WalletData | null) => void;
  connectWallet: (walletData: any) => Promise<{ error: any; data?: any }>;
  disconnectWallet: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}
