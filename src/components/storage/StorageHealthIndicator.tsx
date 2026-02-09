/**
 * Storage Health Indicator
 * 
 * Displays the health status of all storage providers.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  HardDrive, 
  Cloud, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  XCircle 
} from 'lucide-react';
import { 
  StorageProviderType, 
  ProviderHealthCheck, 
  ProviderStatus 
} from '@/types/storageProvider';
import { cn } from '@/lib/utils';

interface StorageHealthIndicatorProps {
  healthStatus: Map<StorageProviderType, ProviderHealthCheck>;
  onRefresh: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
}

const PROVIDER_INFO: Record<StorageProviderType, { icon: typeof HardDrive; name: string }> = {
  filebase: { icon: HardDrive, name: 'Filebase (IPFS)' },
  s3: { icon: Cloud, name: 'Cloudflare R2' },
  arweave: { icon: Database, name: 'Arweave' }
};

const STATUS_CONFIG: Record<ProviderStatus, { 
  color: string; 
  bgColor: string; 
  icon: typeof CheckCircle2;
  label: string;
}> = {
  available: { 
    color: 'text-green-500', 
    bgColor: 'bg-green-500/10', 
    icon: CheckCircle2,
    label: 'Healthy'
  },
  degraded: { 
    color: 'text-amber-500', 
    bgColor: 'bg-amber-500/10', 
    icon: AlertCircle,
    label: 'Degraded'
  },
  unavailable: { 
    color: 'text-red-500', 
    bgColor: 'bg-red-500/10', 
    icon: XCircle,
    label: 'Unavailable'
  }
};

export function StorageHealthIndicator({ 
  healthStatus, 
  onRefresh, 
  isRefreshing = false,
  compact = false 
}: StorageHealthIndicatorProps) {
  const providers: StorageProviderType[] = ['filebase', 's3', 'arweave'];

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {providers.map((provider) => {
          const health = healthStatus.get(provider);
          const status = health?.status || 'unavailable';
          const config = STATUS_CONFIG[status];
          const Icon = PROVIDER_INFO[provider].icon;

          return (
            <div
              key={provider}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                config.bgColor
              )}
              title={`${PROVIDER_INFO[provider].name}: ${config.label}`}
            >
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Storage Providers</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider];
          const health = healthStatus.get(provider);
          const status = health?.status || 'unavailable';
          const statusConfig = STATUS_CONFIG[status];
          const StatusIcon = statusConfig.icon;
          const ProviderIcon = info.icon;

          return (
            <div
              key={provider}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                statusConfig.bgColor,
                "border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <ProviderIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{info.name}</p>
                  {health?.latencyMs && (
                    <p className="text-xs text-muted-foreground">
                      {health.latencyMs}ms latency
                    </p>
                  )}
                </div>
              </div>
              
              <Badge
                variant="secondary"
                className={cn(
                  "flex items-center gap-1",
                  statusConfig.bgColor,
                  statusConfig.color
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
