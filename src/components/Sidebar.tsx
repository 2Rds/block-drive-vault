
import React from 'react';
import { SidebarFolders } from './sidebar/SidebarFolders';
import { SidebarStats } from './sidebar/SidebarStats';
import { SidebarProTip } from './sidebar/SidebarProTip';
import { useUserData } from '@/hooks/useUserData';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
  userFolders?: string[];
  onFolderClick?: (folderPath: string) => void;
  openFolders?: string[];
}

export const Sidebar = ({ 
  selectedFolder, 
  onFolderSelect, 
  userFolders = [], 
  onFolderClick,
  openFolders = []
}: SidebarProps) => {
  const { loading } = useUserData();

  if (loading) {
    return (
    <aside className="w-64 bg-card/80 backdrop-blur-sm border-r border-border h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 pb-8 space-y-8">
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
    <aside className="w-64 bg-card/80 backdrop-blur-sm border-r border-border h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 pb-8 space-y-8">
        <SidebarFolders
          selectedFolder={selectedFolder}
          onFolderSelect={onFolderSelect}
          userFolders={userFolders}
          onFolderClick={onFolderClick}
          openFolders={openFolders}
        />

        <SidebarStats />

        <SidebarProTip />
      </div>
    </aside>
  );
};
