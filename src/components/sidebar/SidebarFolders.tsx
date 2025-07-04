
import React from 'react';
import { Folder, FolderPlus, Database, Archive, FileText, Image, Video, ChevronRight, ChevronDown } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

interface SidebarFoldersProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  userFolders?: string[];
  onFolderClick?: (folderPath: string) => void;
  openFolders?: string[];
}

export const SidebarFolders = ({ 
  selectedFolder, 
  onFolderSelect, 
  userFolders = [], 
  onFolderClick,
  openFolders = []
}: SidebarFoldersProps) => {
  const { userStats, loading } = useUserData();

  // Calculate file counts by type from actual files data
  const getFileCountByType = (type: string) => {
    if (loading || !userStats.actualFiles) return 0;
    
    return userStats.actualFiles.filter(file => {
      const contentType = file.contentType?.toLowerCase() || '';
      switch (type) {
        case 'Documents':
          return contentType.includes('pdf') || 
                 contentType.includes('document') || 
                 contentType.includes('text') ||
                 contentType.includes('application/');
        case 'Images':
          return contentType.startsWith('image/');
        case 'Videos':
          return contentType.startsWith('video/');
        case 'Audio':
          return contentType.startsWith('audio/');
        default:
          return false;
      }
    }).length;
  };

  const defaultFolders = [
    { 
      id: 'all', 
      name: 'All Files', 
      icon: Database, 
      count: loading ? 0 : userStats.totalFiles, 
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
    if (folder.isExpandable && onFolderClick) {
      onFolderClick(folder.path);
    }
    onFolderSelect(folder.id);
  };

  return (
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
  );
};
