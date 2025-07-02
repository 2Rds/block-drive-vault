
import React from 'react';
import { Folder, FolderPlus, Database, Archive, Upload, Download, FileText, Image, Video, ChevronRight, ChevronDown, Slack, Cloud, HardDrive } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  userFolders?: string[];
  onFolderClick?: (folderPath: string) => void;
  openFolders?: string[];
  onSlackClick?: () => void;
  onOneDriveClick?: () => void;
  onGoogleDriveClick?: () => void;
}

export const Sidebar = ({ 
  selectedFolder, 
  onFolderSelect, 
  userFolders = [], 
  onFolderClick,
  openFolders = [],
  onSlackClick,
  onOneDriveClick,
  onGoogleDriveClick
}: SidebarProps) => {
  const { stats, loading } = useUserData();

  // Calculate file counts by type from live data
  const getFileCountByType = (type: string) => {
    if (loading || !stats.filesByType.length) return 0;
    const fileType = stats.filesByType.find(f => f.name === type);
    return fileType ? Math.round((fileType.value / 100) * stats.totalFiles) : 0;
  };

  const defaultFolders = [
    { 
      id: 'all', 
      name: 'All Files', 
      icon: Database, 
      count: loading ? 0 : stats.totalFiles, 
      color: 'text-muted-foreground',
      isExpandable: true,
      path: '/'
    },
    { 
      id: 'documents', 
      name: 'Documents', 
      icon: FileText, 
      count: getFileCountByType('Documents'), 
      color: 'text-muted-foreground',
      isExpandable: true,
      path: '/documents'
    },
    { 
      id: 'images', 
      name: 'Images', 
      icon: Image, 
      count: getFileCountByType('Images'), 
      color: 'text-muted-foreground',
      isExpandable: true,
      path: '/images'
    },
    { 
      id: 'videos', 
      name: 'Videos', 
      icon: Video, 
      count: getFileCountByType('Videos'), 
      color: 'text-muted-foreground',
      isExpandable: true,
      path: '/videos'
    },
    { 
      id: 'archived', 
      name: 'Archived', 
      icon: Archive, 
      count: 0, 
      color: 'text-muted-foreground',
      isExpandable: false,
      path: '/archived'
    },
  ];

  // Add user-created folders to the list
  const userCreatedFolders = userFolders.map((folderName, index) => ({
    id: `user_${folderName.toLowerCase().replace(/\s+/g, '_')}`,
    name: folderName,
    icon: Folder,
    count: 0,
    color: 'text-muted-foreground',
    isExpandable: true,
    path: `/${folderName.toLowerCase().replace(/\s+/g, '_')}`
  }));

  const allFolders = [...defaultFolders, ...userCreatedFolders];

  const handleFolderClick = (folder: any) => {
    // If it's expandable and we have a click handler, expand the folder
    if (folder.isExpandable && onFolderClick) {
      onFolderClick(folder.path);
    }
    // Always select the folder for filtering
    onFolderSelect(folder.id);
  };

  // Integration options
  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      icon: Slack,
      color: 'text-blue-400',
      onClick: onSlackClick
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: Cloud,
      color: 'text-blue-600',
      onClick: onOneDriveClick
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: HardDrive,
      color: 'text-green-500',
      onClick: onGoogleDriveClick
    }
  ];

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

  if (loading) {
    return (
      <aside className="w-64 bg-card/80 backdrop-blur-sm border-r border-border h-screen fixed left-0 top-16 overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded mb-6 w-20"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-xl"></div>
              ))}
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded mb-4 w-32"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted/50 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-card/80 backdrop-blur-sm border-r border-border h-screen fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Folders</h2>
            <button className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-2">
            {allFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:scale-[1.02] ${
                  selectedFolder === folder.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className={`w-5 h-5 ${selectedFolder === folder.id ? 'text-primary' : folder.color}`} />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    selectedFolder === folder.id 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted/50 text-muted-foreground'
                  }`}>
                    {folder.count}
                  </span>
                  {folder.isExpandable && (
                    <div className="text-muted-foreground">
                      {openFolders.includes(folder.path) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Integrations Section */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Integrations</h3>
          <div className="space-y-2">
            {integrations.map((integration) => (
              <button
                key={integration.id}
                onClick={integration.onClick}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all hover:scale-[1.02] text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30"
              >
                <integration.icon className={`w-5 h-5 ${integration.color}`} />
                <span className="text-sm font-medium">{integration.name}</span>
              </button>
            ))}
          </div>
        </div>

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

        <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
          <div className="text-sm font-semibold text-foreground mb-1">Pro Tip</div>
          <div className="text-xs text-muted-foreground">
            Connect your cloud storage accounts to easily migrate files to BlockDrive.
          </div>
        </div>
      </div>
    </aside>
  );
};
