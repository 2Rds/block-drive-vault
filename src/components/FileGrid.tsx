
import React from 'react';
import { File, Folder, Download, Archive, Database } from 'lucide-react';

interface FileGridProps {
  selectedFolder: string;
}

export const FileGrid = ({ selectedFolder }: FileGridProps) => {
  const files = [
    { id: 1, name: 'Project Proposal.pdf', type: 'file', size: '2.4 MB', modified: '2 hours ago', category: 'documents' },
    { id: 2, name: 'Team Photos', type: 'folder', size: '12 files', modified: '1 day ago', category: 'images' },
    { id: 3, name: 'Presentation.pptx', type: 'file', size: '8.1 MB', modified: '3 days ago', category: 'documents' },
    { id: 4, name: 'Marketing Video.mp4', type: 'file', size: '156 MB', modified: '1 week ago', category: 'videos' },
    { id: 5, name: 'Blockchain Data', type: 'folder', size: '24 files', modified: '2 weeks ago', category: 'archived' },
    { id: 6, name: 'Logo Design.png', type: 'file', size: '890 KB', modified: '3 weeks ago', category: 'images' },
    { id: 7, name: 'Smart Contract.sol', type: 'file', size: '15 KB', modified: '1 month ago', category: 'documents' },
    { id: 8, name: 'Demo Recording.mov', type: 'file', size: '234 MB', modified: '1 month ago', category: 'videos' },
  ];

  const filteredFiles = selectedFolder === 'all' 
    ? files 
    : files.filter(file => file.category === selectedFolder);

  const getFileIcon = (type: string, name: string) => {
    if (type === 'folder') return Folder;
    if (name.endsWith('.sol')) return Database;
    return File;
  };

  const getFileColor = (type: string, name: string) => {
    if (type === 'folder') return 'text-blue-400';
    if (name.endsWith('.sol')) return 'text-green-400';
    if (name.endsWith('.pdf')) return 'text-red-400';
    if (name.endsWith('.png') || name.endsWith('.jpg')) return 'text-purple-400';
    if (name.endsWith('.mp4') || name.endsWith('.mov')) return 'text-orange-400';
    return 'text-gray-400';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">
          {selectedFolder === 'all' ? 'All Files' : selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)}
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{filteredFiles.length} items</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file.type, file.name);
          const iconColor = getFileColor(file.type, file.name);
          
          return (
            <div
              key={file.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <IconComponent className={`w-8 h-8 ${iconColor}`} />
                <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-medium text-white text-sm truncate" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-gray-400">{file.size}</p>
                <p className="text-xs text-gray-500">Modified {file.modified}</p>
              </div>
              
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">On-chain</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No files found</h3>
          <p className="text-gray-500">Upload some files to get started with BlockDrive</p>
        </div>
      )}
    </div>
  );
};
