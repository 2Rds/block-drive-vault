
import React, { useState, useCallback } from 'react';
import { Upload, Plus, Shield, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateFolderModal } from './CreateFolderModal';
import { BlockDriveUploadModal } from './files/BlockDriveUploadModal';
import { useBlockDriveUpload } from '@/hooks/useBlockDriveUpload';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UploadAreaProps {
  isUploading?: boolean;
  setIsUploading?: (uploading: boolean) => void;
  onCreateFolder?: (folderName: string) => void;
  onUploadComplete?: (results: any[]) => void;
  currentFolder?: string;
}

export const UploadArea = ({
  isUploading: externalIsUploading,
  setIsUploading: externalSetIsUploading,
  onCreateFolder,
  onUploadComplete,
  currentFolder = '/',
}: UploadAreaProps) => {
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const { isUploading: hookIsUploading, progress, hasKeys } = useBlockDriveUpload();
  const isUploading = externalIsUploading ?? hookIsUploading;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setShowUploadModal(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleCreateFolder = (folderName: string) => {
    console.log('Creating folder:', folderName);
    toast.success(`Folder "${folderName}" created successfully!`);

    if (onCreateFolder) {
      onCreateFolder(folderName);
    }
  };

  const handleUploadComplete = (results: any[]) => {
    if (externalSetIsUploading) {
      externalSetIsUploading(false);
    }
    onUploadComplete?.(results);
  };

  return (
    <>
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300',
          'bg-card/40 backdrop-blur-md',
          isDragOver
            ? 'vault-dropzone-active border-primary'
            : 'border-muted-foreground/30 hover:border-primary/50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Scan line effect when active */}
        {isDragOver && <div className="vault-scan-line rounded-xl" />}

        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div
              className={cn(
                'p-4 rounded-xl transition-all duration-300',
                isDragOver ? 'scale-110 vault-glow' : ''
              )}
              style={{
                backgroundColor: isDragOver
                  ? 'hsl(var(--vault-glow) / 0.3)'
                  : 'hsl(var(--primary) / 0.1)',
              }}
            >
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors duration-300',
                  isDragOver ? 'text-primary' : 'text-primary/70'
                )}
              />
            </div>
          </div>

          {/* Text */}
          <div>
            <h3 className="vault-font-display text-xl font-semibold text-foreground mb-2 tracking-wide">
              {isDragOver ? 'DROP FILES HERE' : 'SECURE UPLOAD'}
            </h3>
            <p className="text-muted-foreground mb-1">
              {isDragOver
                ? 'Release to open upload dialog'
                : 'Drag and drop files, or click to browse'}
            </p>
            <p className="text-xs text-muted-foreground/70 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              AES-256-GCM encryption with on-chain registration
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-center gap-3 pt-2">
            <Button
              onClick={() => setShowUploadModal(true)}
              disabled={isUploading}
              className="vault-font-display tracking-wider"
              style={{
                backgroundColor: 'hsl(var(--primary) / 0.2)',
                borderColor: 'hsl(var(--primary) / 0.5)',
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isUploading ? 'UPLOADING...' : 'CHOOSE FILES'}
            </Button>
            <Button
              onClick={() => setShowCreateFolderModal(true)}
              variant="outline"
              className="border-muted-foreground/30 hover:border-primary/50"
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
          </div>

          {/* Current upload progress indicator */}
          {isUploading && progress && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="vault-font-mono text-xs text-primary">
                  {progress.phase.toUpperCase()}
                </span>
                <span className="vault-font-mono text-xs text-muted-foreground">
                  {progress.progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 animate-[vault-progress-glow_1.5s_ease-in-out_infinite]"
                  style={{
                    width: `${progress.progress}%`,
                    backgroundColor: 'hsl(var(--primary))',
                  }}
                />
              </div>
              <p className="vault-font-mono text-xs text-muted-foreground mt-2 truncate">
                {progress.fileName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />

      <BlockDriveUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        defaultFolder={currentFolder}
      />
    </>
  );
};
