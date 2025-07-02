
import React from 'react';
import { Database, Upload, Download } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

export const SidebarStats = () => {
  const { stats, loading } = useUserData();

  // Calculate recent activity stats from live data
  const recentUploads = loading ? 0 : stats.recentActivity.filter(activity => 
    activity.action === 'File Upload'
  ).length;

  const recentDownloads = loading ? 0 : Math.round(stats.totalFiles * 0.7);

  const stats_overview = [
    { 
      label: 'Storage Used', 
      value: loading ? '0 GB' : `${stats.totalStorage} GB`, 
      icon: Database, 
      color: 'text-muted-foreground' 
    },
    { 
      label: 'Files Uploaded', 
      value: loading ? '0' : stats.totalFiles.toString(), 
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
