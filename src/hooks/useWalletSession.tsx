
import { useState } from 'react';
import { User, Session } from '@supabase/supabase-js';

export const useWalletSession = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);

  const handleWalletAuth = (event: CustomEvent) => {
    console.log('Wallet auth success event received:', event.detail);
    const sessionData = event.detail;
    setSession(sessionData);
    setUser(sessionData.user);
    
    if (sessionData.user?.user_metadata?.wallet_address) {
      const walletInfo = {
        address: sessionData.user.user_metadata.wallet_address,
        publicKey: null,
        adapter: null,
        connected: true,
        autoConnect: false,
        id: sessionData.user.user_metadata.blockchain_type || 'ethereum',
        wallet_address: sessionData.user.user_metadata.wallet_address,
        blockchain_type: sessionData.user.user_metadata.blockchain_type || 'ethereum'
      };
      setWalletData(walletInfo);
      console.log('Set wallet data from auth event:', walletInfo);
    }
    
    setLoading(false);
  };

  return {
    user,
    session,
    loading,
    walletData,
    setUser,
    setSession,
    setLoading,
    setWalletData,
    handleWalletAuth
  };
};
