import React, { useEffect } from 'react';
import { File, Download, Archive, Database, Globe, ExternalLink, ArrowLeft, Eye } from 'lucide-react';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';
import { useAuth } from '@/hooks/useAuth';
import { IPFSFile } from '@/types/ipfs';
import { Button } from '@/components/ui/button';

const BYTES_PER_KB = 1024;
const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'] as const;
const CID_PREVIEW_LENGTH = 12;
const FILEBASE_GATEWAY = 'https://ipfs.filebase.io/ipfs';

interface IPFSFileGridProps {
  selectedFolder: string;
  userFolders?: string[];
  currentPath?: string;
  onGoBack?: () => void;
  onFileSelect?: (file: IPFSFile) => void;
}

export const IPFSFileGrid = ({ 
  selectedFolder, 
  userFolders = [], 
  currentPath = '/',
  onGoBack,
  onFileSelect
}: IPFSFileGridProps) => {
  const { user } = useAuth();
  const { userFiles, loadUserFiles, downloading, downloadFromIPFS, deleteFromIPFS } = useIPFSUpload();

  useEffect(() => {
    if (user) {
      loadUserFiles();
    }
  }, [user]);

  const matchesFolder = (file: IPFSFile, folder: string): boolean => {
    const contentType = file.contentType?.toLowerCase() || '';
    const folderPath = file.folderPath || '/';

    switch (folder) {
      case 'documents':
        return contentType.includes('pdf') ||
               contentType.includes('document') ||
               contentType.includes('text') ||
               contentType.includes('application/');
      case 'images':
        return contentType.startsWith('image/');
      case 'videos':
        return contentType.startsWith('video/');
      case 'audio':
        return contentType.startsWith('audio/');
      default:
        return folderPath.includes(`/${folder}`);
    }
  };

  const filteredFiles = userFiles.filter(file => {
    if (selectedFolder === 'all') {
      if (currentPath === '/') return true;
      const folderPath = file.folderPath || '/';
      return folderPath.startsWith(currentPath);
    }
    return matchesFolder(file, selectedFolder);
  });

  const getFileIcon = (file: IPFSFile) => {
    if (file.contentType?.startsWith('image/')) return File;
    if (file.contentType?.startsWith('video/')) return File;
    if (file.contentType?.startsWith('audio/')) return File;
    if (file.contentType?.includes('pdf') || file.contentType?.includes('document')) return File;
    return Database;
  };

  const getFileColor = (file: IPFSFile) => {
    if (file.contentType?.startsWith('image/')) return 'text-green-400';
    if (file.contentType?.startsWith('video/')) return 'text-red-400';
    if (file.contentType?.startsWith('audio/')) return 'text-purple-400';
    if (file.contentType?.includes('pdf') || file.contentType?.includes('document')) return 'text-blue-400';
    return 'text-gray-400';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
    return parseFloat((bytes / Math.pow(BYTES_PER_KB, i)).toFixed(2)) + ' ' + SIZE_UNITS[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = async (file: IPFSFile) => {
    await downloadFromIPFS(file.cid, file.filename);
  };

  const handleDelete = async (file: IPFSFile) => {
    if (confirm(`Are you sure you want to delete ${file.filename} from BlockDrive IPFS?`)) {
      await deleteFromIPFS(file.id, file.cid);
    }
  };

  const handleViewOnIPFS = (file: IPFSFile) => {
    window.open(`${FILEBASE_GATEWAY}/${file.cid}`, '_blank');
  };

  const handleFileClick = (file: IPFSFile) => {
    onFileSelect?.(file);
  };

  if (!user) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-500">
            Please connect your wallet to view your BlockDrive IPFS files
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {currentPath !== '/' && onGoBack && (
            <Button
              onClick={onGoBack}
              variant="outline"
              size="sm"
              className="bg-gray-600/20 border-gray-600/50 text-gray-400 hover:bg-gray-600/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            {selectedFolder === 'all' ? 'BlockDrive IPFS Storage' : `${selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)} Files`}
            {currentPath !== '/' && (
              <span className="text-sm text-gray-400 font-normal">
                {currentPath}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{filteredFiles.length} files</span>
          <Button
            onClick={loadUserFiles}
            variant="outline"
            size="sm"
            className="bg-blue-600/20 border-blue-600/50 text-blue-400 hover:bg-blue-600/30"
          >
            Refresh
          </Button>
        </div>
      </div>

      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const IconComponent = getFileIcon(file);
            const iconColor = getFileColor(file);
            
            return (
              <div
                key={file.id}
                className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 group cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <div className="flex items-start justify-between mb-3">
                  <IconComponent className={`w-8 h-8 ${iconColor}`} />
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileClick(file);
                      }}
                      className="p-1 rounded hover:bg-white/10"
                      title="View File"
                    >
                      <Eye className="w-4 h-4 text-blue-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOnIPFS(file);
                      }}
                      className="p-1 rounded hover:bg-white/10"
                      title="View on IPFS"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-400" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="p-1 rounded hover:bg-white/10"
                      title="Download from IPFS"
                      disabled={downloading}
                    >
                      <Download className="w-4 h-4 text-green-400" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="font-medium text-white text-sm truncate" title={file.filename}>
                    {file.filename}
                  </h3>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  <p className="text-xs text-gray-500">Uploaded {formatDate(file.uploadedAt)}</p>
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-400">IPFS Pinned</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 truncate" title={file.cid}>
                      CID: {file.cid.substring(0, CID_PREVIEW_LENGTH)}...
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No files in IPFS storage</h3>
          <p className="text-gray-500">
            {selectedFolder === 'all' 
              ? 'Upload some files to your BlockDrive IPFS storage to get started'
              : `No ${selectedFolder} files found in your IPFS storage`
            }
          </p>
        </div>
      )}
    </div>
  );
};
