
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalFiles: number;
  totalStorage: number;
  totalTokens: number;
  totalTransactions: number;
  networkHealth: number;
  filesByType: { name: string; value: number; color: string }[];
  recentActivity: { action: string; file: string; time: string; status: string }[];
  storageUsageData: { month: string; storage: number; uploads: number; downloads: number }[];
  blockchainActivityData: { day: string; transactions: number; confirmations: number; failed: number }[];
}

export const useUserData = () => {
  const { user, walletData } = useAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalFiles: 0,
    totalStorage: 0,
    totalTokens: 0,
    totalTransactions: 0,
    networkHealth: 100,
    filesByType: [],
    recentActivity: [],
    storageUsageData: [],
    blockchainActivityData: []
  });
  const [loading, setLoading] = useState(false);

  const generateMockData = (totalFiles: number, totalStorage: number, totalTokens: number) => {
    // Generate file types distribution
    const fileTypes = [
      { name: 'Documents', value: 35, color: '#8B5CF6' },
      { name: 'Images', value: 25, color: '#06B6D4' },
      { name: 'Videos', value: 20, color: '#10B981' },
      { name: 'Audio', value: 15, color: '#F59E0B' },
      { name: 'Other', value: 5, color: '#EF4444' }
    ];

    // Generate recent activity
    const activities = [
      { action: 'File Upload', file: 'document.pdf', time: '2 hours ago', status: 'Success' },
      { action: 'File Download', file: 'image.png', time: '4 hours ago', status: 'Success' },
      { action: 'Blockchain Sync', file: 'video.mp4', time: '6 hours ago', status: 'Success' },
      { action: 'File Upload', file: 'audio.mp3', time: '1 day ago', status: 'Success' }
    ];

    // Generate storage usage data
    const storageData = [
      { month: 'Jan', storage: 2.5, uploads: 15, downloads: 8 },
      { month: 'Feb', storage: 3.2, uploads: 22, downloads: 12 },
      { month: 'Mar', storage: 4.1, uploads: 18, downloads: 15 },
      { month: 'Apr', storage: totalStorage, uploads: totalFiles, downloads: Math.round(totalFiles * 0.7) }
    ];

    // Generate blockchain activity data
    const blockchainData = [
      { day: 'Mon', transactions: 5, confirmations: 5, failed: 0 },
      { day: 'Tue', transactions: 8, confirmations: 7, failed: 1 },
      { day: 'Wed', transactions: 12, confirmations: 12, failed: 0 },
      { day: 'Thu', transactions: 6, confirmations: 6, failed: 0 },
      { day: 'Fri', transactions: 9, confirmations: 8, failed: 1 },
      { day: 'Sat', transactions: 4, confirmations: 4, failed: 0 },
      { day: 'Sun', transactions: 7, confirmations: 7, failed: 0 }
    ];

    return {
      filesByType: totalFiles > 0 ? fileTypes : [],
      recentActivity: totalFiles > 0 ? activities : [],
      storageUsageData: storageData,
      blockchainActivityData: blockchainData
    };
  };

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
      const totalTransactions = totalTokens * 2; // Mock calculation
      const networkHealth = 100; // Mock value

      // Generate mock data for dashboard
      const mockData = generateMockData(totalFiles, totalStorage, totalTokens);

      setUserStats({
        totalFiles,
        totalStorage,
        totalTokens,
        totalTransactions,
        networkHealth,
        ...mockData
      });

      console.log('User stats updated:', { totalFiles, totalStorage, totalTokens, totalTransactions });

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
