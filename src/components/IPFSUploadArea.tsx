import React, { useRef, useState } from 'react';
import { Upload, Plus, Globe, Shield, Zap, CheckCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreateFolderModal } from './CreateFolderModal';
import { SubscriptionGate } from './SubscriptionGate';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';
import { useAuth } from '@/hooks/useAuth';

const SUCCESS_TIMEOUT_MS = 3000;
const ERROR_TIMEOUT_MS = 5000;

type UploadStatus = 'idle' | 'success' | 'error';

interface IPFSUploadAreaProps {
  onCreateFolder?: (folderName: string) => void;
  selectedFolder?: string;
  onUploadComplete?: () => void;
}

function getUploadAreaClasses(dragOver: boolean, uploading: boolean, uploadStatus: UploadStatus): string {
  const baseClasses = 'bg-gradient-to-br rounded-xl border-2 border-dashed transition-all duration-300 p-8 text-center';

  if (dragOver) {
    return `${baseClasses} border-blue-400/70 bg-blue-900/30 scale-105 from-blue-900/30 to-purple-900/30`;
  }
  if (uploading) {
    return `${baseClasses} border-green-400/50 bg-green-900/20 from-green-900/20 to-blue-900/20`;
  }
  if (uploadStatus === 'success') {
    return `${baseClasses} border-green-400/70 bg-green-900/30 from-green-900/30 to-blue-900/30`;
  }
  if (uploadStatus === 'error') {
    return `${baseClasses} border-red-400/70 bg-red-900/30 from-red-900/30 to-orange-900/30`;
  }
  return `${baseClasses} border-border hover:border-primary/50 hover:bg-blue-900/25 from-blue-900/20 to-purple-900/20`;
}

function getIconContainerClasses(uploading: boolean, uploadStatus: UploadStatus): string {
  const baseClasses = 'p-4 rounded-full transition-all duration-300';

  if (uploading) {
    return `${baseClasses} bg-green-600/20 animate-pulse`;
  }
  if (uploadStatus === 'success') {
    return `${baseClasses} bg-green-600/30`;
  }
  if (uploadStatus === 'error') {
    return `${baseClasses} bg-red-600/30`;
  }
  return `${baseClasses} bg-blue-600/20 hover:bg-blue-600/30`;
}

function getUploadIcon(uploading: boolean, uploadStatus: UploadStatus): React.ReactNode {
  if (uploading) {
    return <Zap className="w-8 h-8 text-green-400 animate-pulse" />;
  }
  if (uploadStatus === 'success') {
    return <CheckCircle className="w-8 h-8 text-green-400" />;
  }
  if (uploadStatus === 'error') {
    return <Key className="w-8 h-8 text-red-400" />;
  }
  return <Upload className="w-8 h-8 text-blue-400" />;
}

function getHeadingText(uploading: boolean, uploadStatus: UploadStatus): string {
  if (uploadStatus === 'success') return 'Upload Successful!';
  if (uploadStatus === 'error') return 'Upload Failed';
  if (uploading) return 'Uploading to BlockDrive IPFS...';
  return 'Upload to BlockDrive IPFS';
}

function getDescriptionText(uploadStatus: UploadStatus): string {
  if (uploadStatus === 'success') return 'Your files have been stored in BlockDrive IPFS via Filebase!';
  if (uploadStatus === 'error') return 'There was an error uploading your files. Please try again.';
  return 'Secure, decentralized storage powered by IPFS via Filebase';
}

export function IPFSUploadArea({ onCreateFolder, selectedFolder, onUploadComplete }: IPFSUploadAreaProps): React.ReactElement | null {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');

  const { uploading, uploadProgress, uploadToIPFS } = useIPFSUpload();
  const { user, session } = useAuth();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadStatus('idle');
    const folderPath = selectedFolder && selectedFolder !== 'all' ? `/${selectedFolder}` : '/';

    try {
      const result = await uploadToIPFS(files, folderPath);
      if (result && result.length > 0) {
        setUploadStatus('success');
        onUploadComplete?.();
        setTimeout(() => setUploadStatus('idle'), SUCCESS_TIMEOUT_MS);
      } else {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), ERROR_TIMEOUT_MS);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), ERROR_TIMEOUT_MS);
    }
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
    onCreateFolder?.(folderName);
  };

  const hasValidSession = session || localStorage.getItem('sb-supabase-auth-token');

  if (!user) {
    return (
      <div className="bg-card rounded-xl border-2 border-dashed border-border p-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-muted/30 rounded-full">
              <Shield className="w-8 h-8 text-muted-foreground/70" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-muted-foreground/70">
              Please connect your Web3 wallet to start uploading files to BlockDrive IPFS via Filebase
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="bg-red-900/20 rounded-xl border-2 border-dashed border-red-600 p-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-red-600/20 rounded-full">
              <Key className="w-8 h-8 text-red-400" />
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

  const uploadContent = (
    <div className={getUploadAreaClasses(dragOver, uploading, uploadStatus)}>
      <div
        className="space-y-6"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex justify-center">
          <div className={getIconContainerClasses(uploading, uploadStatus)}>
            {getUploadIcon(uploading, uploadStatus)}
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold text-foreground mb-3 flex items-center justify-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            {getHeadingText(uploading, uploadStatus)}
          </h3>
          <p className="text-muted-foreground mb-2">
            {getDescriptionText(uploadStatus)}
          </p>

          <div className="flex items-center justify-center gap-4 text-sm text-blue-300 mb-6">
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              DID Secured
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              IPFS Network
            </span>
            <span className="flex items-center gap-1">
              <Key className="w-4 h-4" />
              Filebase Gateway
            </span>
          </div>

          {uploading ? (
            <div className="space-y-4">
              <div className="text-lg font-semibold text-green-400">
                Processing files...
              </div>
              <Progress value={uploadProgress} className="w-full max-w-md mx-auto h-2" />
              <div className="text-sm font-mono text-muted-foreground">
                {uploadProgress.toFixed(0)}% complete
              </div>
            </div>
          ) : uploadStatus === 'idle' ? (
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
          ) : (
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => {
                  setUploadStatus('idle');
                  fileInputRef.current?.click();
                }}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300"
              >
                <Plus className="w-5 h-5 mr-2" />
                {uploadStatus === 'success' ? 'Upload More Files' : 'Try Again'}
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

        {!uploading && uploadStatus === 'idle' && (
          <div className="border-t border-border/30 pt-4 mt-6">
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click "Choose Files" to browse
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Files will be uploaded to BlockDrive IPFS via Filebase
            </p>
          </div>
        )}
      </div>

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
    </div>
  );

  return (
    <SubscriptionGate>
      {uploadContent}
    </SubscriptionGate>
  );
};
