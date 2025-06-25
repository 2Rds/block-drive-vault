
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  totalStorage: number;
  totalFiles: number;
  totalTransactions: number;
  networkHealth: number;
  filesByType: { name: string; value: number; color: string }[];
  storageUsageData: { month: string; storage: number; uploads: number; downloads: number }[];
  blockchainActivityData: { day: string; transactions: number; confirmations: number; failed: number }[];
  recentActivity: { action: string; file: string; time: string; status: string }[];
}

export const useUserData = () => {
  const { user, walletData } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalStorage: 0,
    totalFiles: 0,
    totalTransactions: 0,
    networkHealth: 99.7,
    filesByType: [],
    storageUsageData: [],
    blockchainActivityData: [],
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && walletData) {
      fetchUserData();
    }
  }, [user, walletData]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user files
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
        return;
      }

      // Fetch blockchain tokens for transaction data
      const { data: tokens, error: tokensError } = await supabase
        .from('blockchain_tokens')
        .select('*')
        .eq('wallet_id', walletData?.id);

      if (tokensError) {
        console.error('Error fetching tokens:', tokensError);
      }

      // Calculate stats
      const totalFiles = files?.length || 0;
      const totalStorage = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
      const totalTransactions = tokens?.length || 0;

      // Analyze file types
      const fileTypeCount: { [key: string]: number } = {};
      files?.forEach(file => {
        const type = getFileTypeCategory(file.content_type || '');
        fileTypeCount[type] = (fileTypeCount[type] || 0) + 1;
      });

      const filesByType = Object.entries(fileTypeCount).map(([name, count], index) => ({
        name,
        value: Math.round((count / totalFiles) * 100) || 0,
        color: getColorForFileType(index)
      }));

      // Generate mock time-series data based on actual file count
      const storageUsageData = generateStorageUsageData(totalFiles, totalStorage);
      const blockchainActivityData = generateBlockchainActivityData(totalTransactions);
      const recentActivity = generateRecentActivity(files?.slice(0, 5) || []);

      setStats({
        totalStorage: Math.round(totalStorage / (1024 * 1024 * 1024) * 100) / 100, // Convert to GB
        totalFiles,
        totalTransactions,
        networkHealth: 99.7,
        filesByType,
        storageUsageData,
        blockchainActivityData,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchUserData };
};

const getFileTypeCategory = (contentType: string): string => {
  if (contentType.startsWith('image/')) return 'Images';
  if (contentType.startsWith('video/')) return 'Videos';
  if (contentType.startsWith('audio/')) return 'Audio';
  if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text')) return 'Documents';
  return 'Other';
};

const getColorForFileType = (index: number): string => {
  const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
  return colors[index % colors.length];
};

const generateStorageUsageData = (totalFiles: number, totalStorage: number) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  return months.map((month, index) => ({
    month,
    storage: Math.round((totalStorage * (index + 1) / 6) / (1024 * 1024 * 1024) * 100) / 100,
    uploads: Math.round(totalFiles * (index + 1) / 6),
    downloads: Math.round(totalFiles * (index + 1) / 6 * 1.5)
  }));
};

const generateBlockchainActivityData = (totalTransactions: number) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => {
    const transactions = Math.round(totalTransactions / 7);
    return {
      day,
      transactions,
      confirmations: Math.max(0, transactions - Math.floor(Math.random() * 2)),
      failed: Math.floor(Math.random() * 2)
    };
  });
};

const generateRecentActivity = (files: any[]) => {
  return files.map((file, index) => ({
    action: 'File Upload',
    file: file.filename,
    time: `${(index + 1) * 5} minutes ago`,
    status: 'completed'
  }));
};
