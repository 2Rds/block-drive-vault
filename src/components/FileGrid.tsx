
import React from 'react';
import { File, Folder, Download, Archive, Database } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

interface FileGridProps {
  selectedFolder: string;
}

export const FileGrid = ({ selectedFolder }: FileGridProps) => {
  const { stats, loading } = useUserData();

  // Generate mock files based on real user data
  const generateFilesFromUserData = () => {
    if (loading || !stats.totalFiles) return [];
    
    const files = [];
    const fileTypes = stats.filesByType || [];
    
    // Generate files based on file type distribution
    fileTypes.forEach((fileType, index) => {
      const count = Math.round((fileType.value / 100) * stats.totalFiles);
      
      for (let i = 0; i < count; i++) {
        const fileId = `${fileType.name.toLowerCase()}_${i + 1}`;
        let fileName, fileExtension, category, size;
        
        switch (fileType.name) {
          case 'Documents':
            fileName = `Document_${i + 1}`;
            fileExtension = ['.pdf', '.docx', '.txt'][i % 3];
            category = 'documents';
            size = `${(Math.random() * 5 + 0.5).toFixed(1)} MB`;
            break;
          case 'Images':
            fileName = `Image_${i + 1}`;
            fileExtension = ['.png', '.jpg', '.gif'][i % 3];
            category = 'images';
            size = `${(Math.random() * 2 + 0.1).toFixed(1)} MB`;
            break;
          case 'Videos':
            fileName = `Video_${i + 1}`;
            fileExtension = ['.mp4', '.mov', '.avi'][i % 3];
            category = 'videos';
            size = `${(Math.random() * 200 + 50).toFixed(0)} MB`;
            break;
          case 'Audio':
            fileName = `Audio_${i + 1}`;
            fileExtension = ['.mp3', '.wav', '.flac'][i % 3];
            category = 'audio';
            size = `${(Math.random() * 10 + 1).toFixed(1)} MB`;
            break;
          default:
            fileName = `File_${i + 1}`;
            fileExtension = '.dat';
            category = 'other';
            size = `${(Math.random() * 3 + 0.1).toFixed(1)} MB`;
        }
        
        files.push({
          id: fileId,
          name: fileName + fileExtension,
          type: 'file',
          size,
          modified: `${Math.floor(Math.random() * 30) + 1} days ago`,
          category
        });
      }
    });
    
    return files.slice(0, stats.totalFiles); // Ensure we don't exceed total files
  };

  const files = generateFilesFromUserData();
  
  const filteredFiles = selectedFolder === 'all' 
    ? files 
    : files.filter(file => {
        switch (selectedFolder) {
          case 'documents':
            return file.category === 'documents';
          case 'images':
            return file.category === 'images';
          case 'videos':
            return file.category === 'videos';
          case 'audio':
            return file.category === 'audio';
          case 'archived':
            return false; // No archived files for now
          default:
            return true;
        }
      });

  const getFileIcon = (type: string, name: string) => {
    if (type === 'folder') return Folder;
    if (name.endsWith('.sol')) return Database;
    return File;
  };

  const getFileColor = (type: string, name: string) => {
    if (type === 'folder') return 'text-blue-400';
    if (name.endsWith('.sol')) return 'text-green-400';
    if (name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt')) return 'text-red-400';
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.gif')) return 'text-purple-400';
    if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.avi')) return 'text-orange-400';
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.flac')) return 'text-cyan-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-gray-600 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-600 rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white/5 rounded-lg p-4 border border-white/10 animate-pulse">
              <div className="h-8 w-8 bg-gray-600 rounded mb-3"></div>
              <div className="h-4 bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-600 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-600 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          <p className="text-gray-500">
            {selectedFolder === 'all' 
              ? 'Upload some files to get started with BlockDrive'
              : `No ${selectedFolder} files found`
            }
          </p>
        </div>
      )}
    </div>
  );
};
