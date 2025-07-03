
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalFiles: number;
  totalStorage: number;
  totalTokens: number;
}

export const useUserData = () => {
  const { user, walletData } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalFiles: 0,
    totalStorage: 0,
    totalTokens: 0
  });
  const [loading, setLoading] = useState(false);

  const fetchUserData = async () => {
    if (!user?.id) {
      console.log('No user ID available for data fetching');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Fetching user data for user ID:', user.id);

      // Fetch files count and total storage
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('file_size')
        .eq('user_id', user.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      // Fetch wallets for this user to get wallet IDs
      const { data: userWallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError) {
        console.error('Error fetching wallets:', walletsError);
      }

      let totalTokens = 0;
      
      // Only fetch tokens if we have wallet IDs
      if (userWallets && userWallets.length > 0) {
        const walletIds = userWallets.map(w => w.id);
        
        const { data: tokens, error: tokensError } = await supabase
          .from('blockchain_tokens')
          .select('*')
          .in('wallet_id', walletIds);

        if (tokensError) {
          console.error('Error fetching tokens:', tokensError);
        } else {
          totalTokens = tokens?.length || 0;
        }
      }

      const totalFiles = files?.length || 0;
      const totalStorage = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;

      setUserStats({
        totalFiles,
        totalStorage,
        totalTokens
      });

      console.log('User stats updated:', { totalFiles, totalStorage, totalTokens });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id]);

  return {
    userStats,
    loading,
    refetch: fetchUserData
  };
};
