
import React from 'react';
import { Folder, FolderPlus, Database, Archive, Upload, Download } from 'lucide-react';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
}

export const Sidebar = ({ selectedFolder, onFolderSelect }: SidebarProps) => {
  const folders = [
    { id: 'all', name: 'All Files', icon: Database, count: 42 },
    { id: 'documents', name: 'Documents', icon: Folder, count: 18 },
    { id: 'images', name: 'Images', icon: Folder, count: 12 },
    { id: 'videos', name: 'Videos', icon: Folder, count: 8 },
    { id: 'archived', name: 'Archived', icon: Archive, count: 4 },
  ];

  const stats = [
    { label: 'Total Storage', value: '2.4 GB', icon: Database },
    { label: 'Files Uploaded', value: '127', icon: Upload },
    { label: 'Files Downloaded', value: '89', icon: Download },
  ];

  return (
    <aside className="w-64 bg-black/20 backdrop-blur-md border-r border-white/10 h-screen fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Folders</h2>
            <button className="text-gray-400 hover:text-white">
              <FolderPlus className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className="w-4 h-4" />
                  <span className="text-sm">{folder.name}</span>
                </div>
                <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                  {folder.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Storage Stats</h3>
          <div className="space-y-3">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/5 backdrop-blur-sm rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <stat.icon className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-gray-400">{stat.label}</span>
                </div>
                <div className="text-lg font-semibold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
