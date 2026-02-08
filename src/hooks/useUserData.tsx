// Simplified user data hook for Clerk auth
import { useState, useEffect } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

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
  actualFiles?: any[];
}

export const useUserData = () => {
  const { user, supabase } = useClerkAuth();
  const [userStats, setUserStats] = useState<UserStats>({
    totalFiles: 0,
    totalStorage: 0,
    totalTokens: 0,
    totalTransactions: 0,
    networkHealth: 100,
    filesByType: [],
    recentActivity: [],
    storageUsageData: [],
    blockchainActivityData: [],
    actualFiles: []
  });
  const [loading, setLoading] = useState(false);

  const categorizeFileType = (contentType: string, filename: string) => {
    const type = contentType?.toLowerCase() || '';
    const extension = filename?.toLowerCase().split('.').pop() || '';
    
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'Images';
    }
    if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension)) {
      return 'Videos';
    }
    if (type.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) {
      return 'Audio';
    }
    if (type.includes('pdf') || type.includes('document') || type.includes('text') ||
        ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      return 'Documents';
    }
    return 'Other';
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const generateChartData = (totalFiles: number, totalStorage: number, files: any[]) => {
    const typeCounts: Record<string, number> = { Documents: 0, Images: 0, Videos: 0, Audio: 0, Other: 0 };

    files?.forEach(file => {
      const category = categorizeFileType(file.content_type, file.filename);
      if (category in typeCounts) typeCounts[category]++;
    });

    const fileTypes = Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, count]) => ({
        name,
        value: count,
        color: { Documents: '#8B5CF6', Images: '#06B6D4', Videos: '#10B981', Audio: '#F59E0B', Other: '#EF4444' }[name] || '#6B7280'
      }));

    const recentActivity = files?.length > 0 ? files
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4)
      .map((file) => ({
        action: 'File Upload',
        file: file.filename || 'Uploaded to IPFS',
        time: getTimeAgo(new Date(file.created_at)),
        status: 'Success'
      })) : [];

    const storageInGB = totalStorage > 0 ? Math.round((totalStorage / (1024 * 1024 * 1024)) * 100) / 100 : 0;
    const storageData = [
      { month: 'Jan', storage: storageInGB * 0.7, uploads: Math.round(totalFiles * 0.7), downloads: Math.round(totalFiles * 0.5) },
      { month: 'Feb', storage: storageInGB * 0.8, uploads: Math.round(totalFiles * 0.8), downloads: Math.round(totalFiles * 0.6) },
      { month: 'Mar', storage: storageInGB * 0.9, uploads: Math.round(totalFiles * 0.9), downloads: Math.round(totalFiles * 0.7) },
      { month: 'Apr', storage: storageInGB, uploads: totalFiles, downloads: Math.round(totalFiles * 0.8) }
    ];

    return { filesByType: fileTypes, recentActivity, storageUsageData: storageData, blockchainActivityData: [] };
  };

  const fetchUserData = async () => {
    if (!user?.id || !supabase) return;

    setLoading(true);
    
    try {
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('file_size, filename, created_at, content_type')
        .eq('clerk_user_id', user.id);

      if (filesError) {
        console.error('Error fetching files:', filesError);
      }

      const totalFiles = files?.length || 0;
      const totalStorage = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
      const chartData = generateChartData(totalFiles, totalStorage, files || []);

      setUserStats({
        totalFiles,
        totalStorage,
        totalTokens: 0,
        totalTransactions: 0,
        networkHealth: 100,
        actualFiles: files || [],
        ...chartData
      });

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user?.id, supabase]);

  return { userStats, loading, refetch: fetchUserData };
};
