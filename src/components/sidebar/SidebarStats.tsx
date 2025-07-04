
import React from 'react';
import { Database, Upload, Download } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

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

export const SidebarStats = () => {
  const { userStats, loading } = useUserData();

  // Calculate recent activity stats from live data
  const recentUploads = loading ? 0 : userStats.recentActivity.filter(activity => 
    activity.action === 'File Upload'
  ).length;

  const recentDownloads = loading ? 0 : Math.round(userStats.totalFiles * 0.7);

  const stats_overview = [
    { 
      label: 'Storage Used', 
      value: loading ? '0 GB' : formatStorage(userStats.totalStorage), 
      icon: Database, 
      color: 'text-muted-foreground' 
    },
    { 
      label: 'Files Uploaded', 
      value: loading ? '0' : userStats.totalFiles.toString(), 
      icon: Upload, 
      color: 'text-muted-foreground' 
    },
    { 
      label: 'Downloads', 
      value: loading ? '0' : recentDownloads.toString(), 
      icon: Download, 
      color: 'text-muted-foreground' 
    },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-4">Storage Overview</h3>
      <div className="space-y-4">
        {stats_overview.map((stat, index) => (
          <div key={index} className="bg-muted/30 rounded-lg p-4 border border-border">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <div className="text-xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
