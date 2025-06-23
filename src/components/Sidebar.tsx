
import React from 'react';
import { Folder, FolderPlus, Database, Archive, Upload, Download, FileText, Image, Video } from 'lucide-react';

interface SidebarProps {
  selectedFolder: string;
  onFolderSelect: (folder: string) => void;
}

export const Sidebar = ({ selectedFolder, onFolderSelect }: SidebarProps) => {
  const folders = [
    { id: 'all', name: 'All Files', icon: Database, count: 42, color: 'text-blue-600' },
    { id: 'documents', name: 'Documents', icon: FileText, count: 18, color: 'text-orange-600' },
    { id: 'images', name: 'Images', icon: Image, count: 12, color: 'text-green-600' },
    { id: 'videos', name: 'Videos', icon: Video, count: 8, color: 'text-red-600' },
    { id: 'archived', name: 'Archived', icon: Archive, count: 4, color: 'text-gray-600' },
  ];

  const stats = [
    { label: 'Storage Used', value: '2.4 GB', icon: Database, color: 'text-blue-600' },
    { label: 'Files Uploaded', value: '127', icon: Upload, color: 'text-green-600' },
    { label: 'Downloads', value: '89', icon: Download, color: 'text-purple-600' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-16 overflow-y-auto">
      <div className="p-6 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
            <button className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
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
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <folder.icon className={`w-5 h-5 ${selectedFolder === folder.id ? 'text-blue-600' : folder.color}`} />
                  <span className="text-sm font-medium">{folder.name}</span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedFolder === folder.id 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {folder.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Storage Overview</h3>
          <div className="space-y-4">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-600">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
          <div className="text-sm font-semibold text-gray-900 mb-1">Pro Tip</div>
          <div className="text-xs text-gray-600">
            Upload files securely with blockchain-verified ownership tokens.
          </div>
        </div>
      </div>
    </aside>
  );
};
