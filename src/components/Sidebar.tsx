
import React from 'react';
import { Folder, FolderPlus, Database, Archive, Upload, Download, FileText, Image, Video } from 'lucide-react';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
}

export const Sidebar = ({ selectedFolder, onFolderSelect }: SidebarProps) => {
  const folders = [
    { id: 'all', name: 'All Files', icon: Database, count: 42, color: 'text-blue-400' },
    { id: 'documents', name: 'Documents', icon: FileText, count: 18, color: 'text-purple-400' },
    { id: 'images', name: 'Images', icon: Image, count: 12, color: 'text-blue-300' },
    { id: 'videos', name: 'Videos', icon: Video, count: 8, color: 'text-purple-300' },
    { id: 'archived', name: 'Archived', icon: Archive, count: 4, color: 'text-gray-400' },
  ];

  const stats = [
    { label: 'Storage Used', value: '2.4 GB', icon: Database, color: 'text-blue-400' },
    { label: 'Files Uploaded', value: '127', icon: Upload, color: 'text-purple-400' },
    { label: 'Downloads', value: '89', icon: Download, color: 'text-blue-300' },
  ];

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
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => onFolderSelect(folder.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  selectedFolder === folder.id
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-gray-300 hover:bg-gray-700/30 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className={`w-5 h-5 ${selectedFolder === folder.id ? 'text-blue-400' : folder.color}`} />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-600/20 text-blue-300' 
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
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-purple-600/20`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-300">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 border border-blue-500/30">
          <div className="text-sm font-semibold text-white mb-1">Pro Tip</div>
          <div className="text-xs text-gray-300">
            Upload files securely with blockchain-verified ownership tokens.
          </div>
        </div>
      </div>
    </aside>
  );
};
