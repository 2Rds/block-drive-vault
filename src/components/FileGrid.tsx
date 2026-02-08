
import React from 'react';
import { File, Folder, Download, Archive, Database } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

const SKELETON_COUNT = 8;
const DEFAULT_FILE_COLOR = 'text-blue-600';

interface FileGridProps {
  selectedFolder: string;
  userFolders?: string[];
}

export const FileGrid = ({ selectedFolder, userFolders = [] }: FileGridProps) => {
  const { userStats, loading } = useUserData();

  // Generate mock files based on real user data
  const generateFilesFromUserData = () => {
    if (loading || !userStats.totalFiles) return [];

    const files = [];
    const fileTypes = userStats.filesByType || [];

    // Add user-created folders first
    userFolders.forEach((folderName, index) => {
      files.push({
        id: `user_folder_${index}`,
        name: folderName,
        type: 'folder',
        size: '\u2014',
        modified: 'Just now',
        category: 'folder'
      });
    });

    // Generate files based on file type distribution
    fileTypes.forEach((fileType, index) => {
      const count = Math.round((fileType.value / 100) * userStats.totalFiles);

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

    return files;
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

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border/50">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => i + 1).map((i) => (
            <div key={i} className="bg-muted/20 rounded-lg p-4 border border-border/30 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded mb-3"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded w-16 mb-1"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">
          {selectedFolder === 'all' ? 'All Files' : selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)}
        </h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>{filteredFiles.length} items</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const IconComponent = getFileIcon(file.type, file.name);

          return (
            <div
              key={file.id}
              className="bg-muted/20 rounded-lg p-4 border border-border/30 hover:bg-muted/30 hover:border-border transition-all duration-300 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <IconComponent className={`w-8 h-8 ${DEFAULT_FILE_COLOR}`} />
                {file.type !== 'folder' && (
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Download className="w-4 h-4 text-blue-600 hover:text-blue-400" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <h3 className="font-medium text-foreground text-sm truncate" title={file.name}>
                  {file.name}
                </h3>
                <p className="text-xs text-muted-foreground">{file.size}</p>
                <p className="text-xs text-muted-foreground/70">Modified {file.modified}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-muted-foreground">On-chain</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">No files found</h3>
          <p className="text-muted-foreground/70">
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
