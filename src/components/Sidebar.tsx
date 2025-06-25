
import React from 'react';
import { Folder, FolderPlus, Database, Archive, Upload, Download, FileText, Image, Video } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  userFolders?: string[];
}

export const Sidebar = ({ selectedFolder, onFolderSelect, userFolders = [] }: SidebarProps) => {
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
      color: 'text-gray-400' 
    },
    { 
      id: 'documents', 
      name: 'Documents', 
      icon: FileText, 
      count: getFileCountByType('Documents'), 
      color: 'text-gray-400' 
    },
    { 
      id: 'images', 
      name: 'Images', 
      icon: Image, 
      count: getFileCountByType('Images'), 
      color: 'text-gray-400' 
    },
    { 
      id: 'videos', 
      name: 'Videos', 
      icon: Video, 
      count: getFileCountByType('Videos'), 
      color: 'text-gray-400' 
    },
    { 
      id: 'archived', 
      name: 'Archived', 
      icon: Archive, 
      count: 0, 
      color: 'text-gray-400' 
    },
  ];

  // Add user-created folders to the list
  const userCreatedFolders = userFolders.map((folderName, index) => ({
    id: `user_${folderName.toLowerCase().replace(/\s+/g, '_')}`,
    name: folderName,
    icon: Folder,
    count: 0, // New folders start empty
    color: 'text-gray-400'
  }));

  const allFolders = [...defaultFolders, ...userCreatedFolders];

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
      color: 'text-gray-400' 
    },
    { 
      label: 'Files Uploaded', 
      value: loading ? '0' : stats.totalFiles.toString(), 
      icon: Upload, 
      color: 'text-gray-400' 
    },
    { 
      label: 'Downloads', 
      value: loading ? '0' : recentDownloads.toString(), 
      icon: Download, 
      color: 'text-gray-400' 
    },
  ];

  if (loading) {
    return (
      <aside className="w-64 bg-gray-800/40 backdrop-blur-sm border-r border-gray-700 h-screen fixed left-0 top-16 overflow-y-auto">
        <div className="p-6 space-y-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-600 rounded mb-6 w-20"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-gray-700/30 rounded-xl"></div>
              ))}
            </div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-600 rounded mb-4 w-32"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-700/30 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-gray-800/40 backdrop-blur-sm border-r border-gray-700 h-screen fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Folders</h2>
            <button className="text-gray-400 hover:text-white hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-2">
            {allFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  selectedFolder === folder.id
                    ? 'bg-blue-600/20 text-white border border-blue-600/50'
                    : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className={`w-5 h-5 ${selectedFolder === folder.id ? 'text-blue-400' : folder.color}`} />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-600/30 text-blue-200' 
                    : 'bg-gray-700/50 text-gray-400'
                }`}>
                  {folder.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Storage Overview</h3>
          <div className="space-y-4">
            {stats_overview.map((stat, index) => (
              <div key={index} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-2 rounded-lg bg-gray-600/30">
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-300">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50">
          <div className="text-sm font-semibold text-white mb-1">Pro Tip</div>
          <div className="text-xs text-gray-300">
            Upload files securely with blockchain-verified ownership tokens.
          </div>
        </div>
      </div>
    </aside>
  );
};
