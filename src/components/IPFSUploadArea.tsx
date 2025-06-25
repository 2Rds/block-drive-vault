
import React, { useRef, useState } from 'react';
import { Upload, Plus, Globe, Shield, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreateFolderModal } from './CreateFolderModal';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';
import { useAuth } from '@/hooks/useAuth';

interface IPFSUploadAreaProps {
  onCreateFolder?: (folderName: string) => void;
  selectedFolder?: string;
}

export const IPFSUploadArea = ({ onCreateFolder, selectedFolder }: IPFSUploadAreaProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  const { uploading, uploadProgress, uploadToIPFS } = useIPFSUpload();
  const { user, session } = useAuth();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const folderPath = selectedFolder && selectedFolder !== 'all' ? `/${selectedFolder}` : '/';
    await uploadToIPFS(files, folderPath);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleCreateFolder = (folderName: string) => {
    console.log('Creating folder:', folderName);
    if (onCreateFolder) {
      onCreateFolder(folderName);
    }
  };

  // Check if user has a valid session
  const hasValidSession = session || localStorage.getItem('sb-supabase-auth-token');

  if (!user) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-md rounded-xl border-2 border-dashed border-gray-600 p-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gray-600/20 rounded-full">
              <Shield className="w-8 h-8 text-gray-500" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-gray-500">
              Please connect your Web3 wallet to start uploading files to IPFS
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="bg-red-900/20 backdrop-blur-md rounded-xl border-2 border-dashed border-red-600 p-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-red-600/20 rounded-full">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-red-300 mb-2">
              Authentication Session Expired
            </h3>
            <p className="text-red-400 mb-4">
              Your wallet session has expired. Please reconnect your wallet to continue uploading files.
            </p>
            <Button
              onClick={() => window.location.href = '/auth'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reconnect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-md rounded-xl border-2 border-dashed transition-all duration-300 p-8 text-center ${
        dragOver 
          ? 'border-blue-400/70 bg-blue-900/30 scale-105' 
          : uploading 
            ? 'border-green-400/50 bg-green-900/20'
            : 'border-blue-500/30 hover:border-blue-400/50 hover:bg-blue-900/25'
      }`}>
        <div
          className="space-y-6"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex justify-center">
            <div className={`p-4 rounded-full transition-all duration-300 ${
              uploading 
                ? 'bg-green-600/20 animate-pulse' 
                : 'bg-blue-600/20 hover:bg-blue-600/30'
            }`}>
              {uploading ? (
                <Zap className="w-8 h-8 text-green-400" />
              ) : (
                <Upload className="w-8 h-8 text-blue-400" />
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-white mb-3 flex items-center justify-center gap-2">
              <Globe className="w-6 h-6 text-blue-400" />
              Upload to IPFS Network
            </h3>
            <p className="text-gray-300 mb-2">
              Decentralized, immutable storage on the InterPlanetary File System
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-blue-300 mb-6">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                Decentralized
              </span>
              <span className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Fast Access
              </span>
            </div>
            
            {uploading ? (
              <div className="space-y-4">
                <div className="text-lg font-semibold text-green-400">
                  Uploading to IPFS Network...
                </div>
                <Progress value={uploadProgress} className="w-full max-w-md mx-auto h-2" />
                <div className="text-sm text-gray-400">
                  {uploadProgress.toFixed(0)}% complete
                </div>
              </div>
            ) : (
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105"
                  disabled={uploading}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Choose Files
                </Button>
                <Button 
                  onClick={() => setShowCreateFolderModal(true)}
                  className="bg-blue-600/20 border-blue-600/50 text-blue-300 hover:bg-blue-600/30 hover:border-blue-600/70 hover:text-blue-200 font-semibold px-6 py-3 rounded-lg transition-all duration-300"
                  variant="outline"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Folder
                </Button>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            accept="*/*"
          />
          
          {!uploading && (
            <div className="border-t border-gray-600/30 pt-4 mt-6">
              <p className="text-sm text-gray-400">
                Drag and drop files here, or click "Choose Files" to browse
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Files are stored on IPFS and referenced by content hash (CID)
              </p>
            </div>
          )}
        </div>
      </div>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </>
  );
};
