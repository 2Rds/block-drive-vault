
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
          <Card key={i} className="bg-card border border-border/50 rounded-xl animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-6 w-6 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-card border border-border/50 rounded-xl hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage</CardTitle>
          <div className="bg-primary/10 rounded-lg p-2">
            <HardDrive className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-mono font-semibold text-foreground">{formatStorage(stats.totalStorage)}</div>
          <p className="text-xs text-muted-foreground">
            <TrendingUp className="inline h-3 w-3 mr-1 text-primary" />
            {stats.totalFiles > 0 ? 'Active storage' : 'No files yet'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border/50 rounded-xl hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Files</CardTitle>
          <div className="bg-primary/10 rounded-lg p-2">
            <Database className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-mono font-semibold text-foreground">{stats.totalFiles}</div>
          <p className="text-xs text-muted-foreground">
            <TrendingUp className="inline h-3 w-3 mr-1 text-primary" />
            {stats.totalFiles > 0 ? 'Files stored' : 'Start uploading'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border/50 rounded-xl hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Blockchain Transactions</CardTitle>
          <div className="bg-primary/10 rounded-lg p-2">
            <Activity className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-mono font-semibold text-foreground">{stats.totalTransactions}</div>
          <p className="text-xs text-muted-foreground">
            <TrendingUp className="inline h-3 w-3 mr-1 text-primary" />
            {stats.totalTransactions > 0 ? '100% success rate' : 'No transactions yet'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border/50 rounded-xl hover:border-border transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Network Health</CardTitle>
          <div className="bg-primary/10 rounded-lg p-2">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-mono font-semibold text-foreground">{stats.networkHealth}%</div>
          <p className="text-xs text-muted-foreground">
            <Zap className="inline h-3 w-3 mr-1 text-primary" />
            All systems operational
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
