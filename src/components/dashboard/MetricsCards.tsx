
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  HardDrive, 
  Database, 
  Activity, 
  Shield, 
  TrendingUp, 
  Zap 
} from 'lucide-react';

interface UserStats {
  totalStorage: number;
  totalFiles: number;
  totalTransactions: number;
  networkHealth: number;
}

interface MetricsCardsProps {
  stats: UserStats;
  loading: boolean;
}

const formatStorage = (bytes: number): string => {
  if (bytes === 0) return '0 GB';
  
  const gb = bytes / (1024 * 1024 * 1024);
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;
  
  if (gb >= 1) {
    return `${Math.round(gb * 100) / 100} GB`;
  } else if (mb >= 1) {
    return `${Math.round(mb * 100) / 100} MB`;
  } else if (kb >= 1) {
    return `${Math.round(kb * 100) / 100} KB`;
  } else {
    return `${bytes} B`;
  }
};

export const MetricsCards = ({ stats, loading }: MetricsCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-gray-800/40 border-gray-700/50 animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-600 rounded w-20"></div>
              <div className="h-6 w-6 bg-gray-600 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-600 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Total Storage</CardTitle>
          <HardDrive className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{formatStorage(stats.totalStorage)}</div>
          <p className="text-xs text-gray-400">
            <TrendingUp className="inline h-3 w-3 mr-1 text-blue-600" />
            {stats.totalFiles > 0 ? 'Active storage' : 'No files yet'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Total Files</CardTitle>
          <Database className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats.totalFiles}</div>
          <p className="text-xs text-gray-400">
            <TrendingUp className="inline h-3 w-3 mr-1 text-blue-600" />
            {stats.totalFiles > 0 ? 'Files stored' : 'Start uploading'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Blockchain Transactions</CardTitle>
          <Activity className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats.totalTransactions}</div>
          <p className="text-xs text-gray-400">
            <TrendingUp className="inline h-3 w-3 mr-1 text-blue-600" />
            {stats.totalTransactions > 0 ? '100% success rate' : 'No transactions yet'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-300">Network Health</CardTitle>
          <Shield className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats.networkHealth}%</div>
          <p className="text-xs text-gray-400">
            <Zap className="inline h-3 w-3 mr-1 text-blue-600" />
            All systems operational
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
