
export interface User {
  id: string;
  email?: string;
  wallet_address?: string;
  user_metadata?: {
    wallet_address?: string;
    blockchain_type?: string;
    username?: string;
    full_name?: string;
    solana_subdomain?: string;
  };
}

export interface WalletData {
  id: string;
  address: string;
  publicKey?: string;
  adapter?: any;
  connected: boolean;
  autoConnect: boolean;
  wallet_address: string;
  blockchain_type: string;
}

export interface AuthContextType {
  user: User | null;
  session: any | null;
  walletData: WalletData | null;
  loading: boolean;
  connectWallet: (walletData: any) => Promise<{ error: any; data?: any }>;
  disconnectWallet: () => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  setWalletData: (data: WalletData) => void;
}
