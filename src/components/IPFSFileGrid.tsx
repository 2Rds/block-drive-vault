
import React from 'react';
import { Download, Trash2, FileText, Image, Video, Music, Archive, File, Globe, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHybridStorage } from '@/hooks/useHybridStorage';
import { IPFSFile } from '@/types/ipfs';
import { formatBytes, formatDate } from '@/lib/utils';

interface IPFSFileGridProps {
  files: IPFSFile[];
  loading: boolean;
  selectedFolder: string;
  onCreateFolder?: (folderName: string) => void;
}

export const IPFSFileGrid = ({ files, loading, selectedFolder }: IPFSFileGridProps) => {
  const { downloadFile, deleteFile, downloading } = useHybridStorage();

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return Image;
    if (contentType.startsWith('video/')) return Video;
    if (contentType.startsWith('audio/')) return Music;
    if (contentType.includes('zip') || contentType.includes('rar')) return Archive;
    if (contentType.includes('pdf') || contentType.includes('document')) return FileText;
    return File;
  };

  const getStorageTypeInfo = (file: IPFSFile) => {
    const storageType = file.metadata?.storage_type || 'ipfs';
    
    if (storageType === 'solana-inscription') {
      return {
        type: 'Solana Inscription',
        icon: Zap,
        color: 'bg-orange-500',
        textColor: 'text-orange-100',
        description: 'Permanent on-chain storage',
        permanence: 'Permanent'
      };
    }
    
    return {
      type: 'IPFS',
      icon: Globe,
      color: 'bg-blue-500',
      textColor: 'text-blue-100',
      description: 'Distributed storage',
      permanence: 'Temporary'
    };
  };

  const handleDownload = async (file: IPFSFile) => {
    try {
      await downloadFile(file);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async (file: IPFSFile) => {
    if (window.confirm(`Are you sure you want to delete "${file.filename}"?`)) {
      try {
        await deleteFile(file.id, file.cid);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-300">Loading your files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="border-gray-700 bg-gray-800/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No files found</h3>
          <p className="text-gray-400 text-center">
            {selectedFolder === 'all' 
              ? 'Upload your first file using the hybrid storage system above'
              : `No files in the "${selectedFolder}" folder`
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">
          {selectedFolder === 'all' ? 'All Files' : `Files in "${selectedFolder}"`}
        </h3>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {files.map((file) => {
          const FileIcon = getFileIcon(file.contentType);
          const storageInfo = getStorageTypeInfo(file);
          const StorageIcon = storageInfo.icon;

          return (
            <Card 
              key={file.id} 
              className="border-gray-700 bg-gray-800/50 hover:bg-gray-800/70 transition-all duration-200 group"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white truncate">
                      {file.filename}
                    </span>
                  </div>
                </div>

                {/* Storage Type Badge */}
                <div className="mb-3">
                  <Badge 
                    variant="secondary" 
                    className={`${storageInfo.color} ${storageInfo.textColor} text-xs`}
                  >
                    <StorageIcon className="w-3 h-3 mr-1" />
                    {storageInfo.type}
                  </Badge>
                </div>

                {/* File Details */}
                <div className="space-y-1 text-xs text-gray-400 mb-4">
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="truncate ml-2">{file.contentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage:</span>
                    <span>{storageInfo.permanence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Uploaded:</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>
                  {file.metadata?.shard_count && (
                    <div className="flex justify-between">
                      <span>Shards:</span>
                      <span>{file.metadata.shard_count}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(file)}
                    disabled={downloading}
                    className="flex-1 text-xs border-gray-600 hover:border-blue-500 hover:text-blue-400"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {downloading ? 'Downloading...' : 'Download'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(file)}
                    className="border-gray-600 hover:border-red-500 hover:text-red-400"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* Storage Details Tooltip */}
                <div className="mt-2 p-2 bg-gray-900/50 rounded text-xs text-gray-300">
                  <div className="flex items-center space-x-1 mb-1">
                    <StorageIcon className="w-3 h-3" />
                    <span className="font-medium">{storageInfo.description}</span>
                  </div>
                  {file.metadata?.storage_type === 'solana-inscription' && (
                    <div className="text-orange-400 text-xs">
                      ID: {file.cid.slice(0, 8)}...{file.cid.slice(-8)}
                    </div>
                  )}
                  {file.metadata?.storage_type === 'ipfs' && (
                    <div className="text-blue-400 text-xs">
                      CID: {file.cid.slice(0, 8)}...{file.cid.slice(-8)}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
