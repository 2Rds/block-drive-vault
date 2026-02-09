/**
 * BlockDriveUploadModal
 *
 * Full-featured upload interface with the Vault Terminal aesthetic.
 * Features drag-and-drop, security level selection, and encryption visualization.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Upload,
  X,
  FileIcon,
  Folder,
  AlertCircle,
  CheckCircle,
  Link2,
  Loader2,
  Key,
} from 'lucide-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { useBlockDriveUpload } from '@/hooks/useBlockDriveUpload';
import { useAuth } from '@/hooks/useAuth';
import { SecurityLevelSelectorRing } from './SecurityLevelRing';
import { EncryptionPhaseIndicator } from './EncryptionPhaseIndicator';
import { DataBlockAnimation } from './DataBlockAnimation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BlockDriveUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (results: any[]) => void;
  defaultSecurityLevel?: SecurityLevel;
  defaultFolder?: string;
  enableOnChain?: boolean;
}

interface QueuedFile {
  file: File;
  id: string;
  status: 'queued' | 'uploading' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export function BlockDriveUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
  defaultSecurityLevel = SecurityLevel.STANDARD,
  defaultFolder = '/',
  enableOnChain: defaultEnableOnChain = true,
}: BlockDriveUploadModalProps) {
  const { walletData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(defaultSecurityLevel);
  const [folderPath, setFolderPath] = useState(defaultFolder);
  const [enableOnChain, setEnableOnChain] = useState(defaultEnableOnChain);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'complete' | 'error'>('idle');

  // Upload hook
  const {
    uploadFile,
    progress,
    isUploading,
    hasKeys,
    initializeCrypto,
    cryptoState,
  } = useBlockDriveUpload({
    enableOnChainRegistration: enableOnChain,
  });

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: QueuedFile[] = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: 'queued',
      progress: 0,
    }));

    setQueuedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // Handle drag events
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setQueuedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  // Start upload process
  const handleStartUpload = async () => {
    if (!walletData?.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!hasKeys) {
      toast.info('Initializing encryption keys...');
      const success = await initializeCrypto();
      if (!success) {
        toast.error('Failed to initialize encryption keys');
        return;
      }
    }

    if (queuedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploadState('uploading');
    const results: any[] = [];

    for (let i = 0; i < queuedFiles.length; i++) {
      const queuedFile = queuedFiles[i];

      // Update status to uploading
      setQueuedFiles((prev) =>
        prev.map((f) =>
          f.id === queuedFile.id ? { ...f, status: 'uploading' } : f
        )
      );

      try {
        // Get sign transaction function if on-chain is enabled
        const signTransaction = enableOnChain && walletData?.adapter?.signTransaction
          ? (tx: any) => walletData.adapter!.signTransaction!(tx)
          : undefined;

        const result = await uploadFile(
          queuedFile.file,
          securityLevel,
          undefined, // Use default storage config
          folderPath,
          signTransaction
        );

        if (result?.success) {
          results.push(result);
          setQueuedFiles((prev) =>
            prev.map((f) =>
              f.id === queuedFile.id
                ? { ...f, status: 'complete', progress: 100 }
                : f
            )
          );
        } else {
          setQueuedFiles((prev) =>
            prev.map((f) =>
              f.id === queuedFile.id
                ? { ...f, status: 'error', error: 'Upload failed' }
                : f
            )
          );
        }
      } catch (error) {
        setQueuedFiles((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    setUploadState(results.length === queuedFiles.length ? 'complete' : 'error');

    if (results.length > 0) {
      onUploadComplete?.(results);
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Reset modal state
  const handleClose = () => {
    if (!isUploading) {
      setQueuedFiles([]);
      setUploadState('idle');
      onClose();
    }
  };

  // Get animation phase for DataBlockAnimation
  const getAnimationPhase = () => {
    if (!progress) return 'idle';
    if (progress.phase === 'encrypting') return 'fragmenting';
    if (progress.phase === 'complete') return 'complete';
    return 'reassembling';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-card/95 backdrop-blur-xl border-primary/20 overflow-hidden">
        {/* Scan line effect */}
        <div className="vault-scan-line" />

        <DialogHeader>
          <DialogTitle className="vault-font-display text-xl tracking-wide flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center vault-glow"
              style={{ backgroundColor: 'hsl(var(--vault-glow) / 0.2)' }}
            >
              <Upload className="w-5 h-5 text-primary" />
            </div>
            SECURE UPLOAD
          </DialogTitle>
          <DialogDescription className="vault-font-mono text-xs text-muted-foreground">
            Files encrypted with AES-256-GCM using wallet-derived keys
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Keys not initialized warning */}
          {!hasKeys && walletData?.connected && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <Key className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-amber-400 font-medium">Encryption Keys Required</p>
                <p className="text-xs text-muted-foreground">
                  Answer your security question to unlock encryption keys
                </p>
              </div>
              <Button
                size="sm"
                onClick={initializeCrypto}
                disabled={cryptoState.isInitializing}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30"
              >
                {cryptoState.isInitializing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Initialize'
                )}
              </Button>
            </div>
          )}

          {/* Upload in progress view */}
          {isUploading && progress ? (
            <div className="space-y-6">
              {/* Data block animation */}
              <div className="flex justify-center">
                <DataBlockAnimation phase={getAnimationPhase()} />
              </div>

              {/* Phase indicator */}
              <EncryptionPhaseIndicator
                phase={progress.phase}
                progress={progress.progress}
                message={progress.message}
                variant="upload"
              />

              {/* Current file */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <FileIcon className="w-5 h-5 text-muted-foreground" />
                <span className="vault-font-mono text-sm truncate flex-1">
                  {progress.fileName}
                </span>
              </div>
            </div>
          ) : uploadState === 'complete' ? (
            /* Upload complete view */
            <div className="text-center py-8 space-y-4">
              <div
                className="w-20 h-20 mx-auto rounded-full flex items-center justify-center vault-glow-success"
                style={{ backgroundColor: 'hsl(var(--vault-success) / 0.2)' }}
              >
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h3 className="vault-font-display text-lg text-green-400">UPLOAD COMPLETE</h3>
                <p className="vault-font-mono text-xs text-muted-foreground mt-1">
                  {queuedFiles.filter((f) => f.status === 'complete').length} file(s) encrypted
                  and stored
                </p>
              </div>
              <Button onClick={handleClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : (
            /* File selection view */
            <>
              {/* Drag and drop zone */}
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer',
                  isDragOver
                    ? 'vault-dropzone-active'
                    : 'border-muted-foreground/30 hover:border-primary/50'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {isDragOver && <div className="vault-scan-line rounded-xl" />}

                <div className="space-y-3">
                  <div
                    className={cn(
                      'w-16 h-16 mx-auto rounded-xl flex items-center justify-center transition-all duration-300',
                      isDragOver ? 'scale-110' : ''
                    )}
                    style={{
                      backgroundColor: isDragOver
                        ? 'hsl(var(--vault-glow) / 0.3)'
                        : 'hsl(var(--muted))',
                    }}
                  >
                    <Upload
                      className={cn(
                        'w-8 h-8 transition-colors duration-300',
                        isDragOver ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragOver ? 'Drop files here' : 'Drag files or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      All files encrypted before upload
                    </p>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Queued files */}
              {queuedFiles.length > 0 && (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Files to upload ({queuedFiles.length})
                  </Label>
                  {queuedFiles.map((qf) => (
                    <div
                      key={qf.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        qf.status === 'complete'
                          ? 'border-green-500/30 bg-green-500/10'
                          : qf.status === 'error'
                          ? 'border-red-500/30 bg-red-500/10'
                          : 'border-border bg-muted/30'
                      )}
                    >
                      <FileIcon
                        className={cn(
                          'w-5 h-5 flex-shrink-0',
                          qf.status === 'complete'
                            ? 'text-green-400'
                            : qf.status === 'error'
                            ? 'text-red-400'
                            : 'text-muted-foreground'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="vault-font-mono text-sm truncate">{qf.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(qf.file.size)}
                          {qf.error && (
                            <span className="text-red-400 ml-2">{qf.error}</span>
                          )}
                        </p>
                      </div>
                      {qf.status === 'complete' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : qf.status === 'error' ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(qf.id);
                          }}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Security level selector */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Security Level
                </Label>
                <SecurityLevelSelectorRing
                  value={securityLevel}
                  onChange={setSecurityLevel}
                  disabled={isUploading}
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Options
                </Label>

                {/* On-chain registration toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Link2 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-medium">On-Chain Registration</p>
                      <p className="text-xs text-muted-foreground">
                        Record file commitment on Solana
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableOnChain}
                    onCheckedChange={setEnableOnChain}
                    disabled={isUploading}
                  />
                </div>

                {/* Folder path */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                  <Folder className="w-5 h-5 text-amber-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Folder</p>
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      className="vault-font-mono text-xs bg-transparent border-none outline-none text-muted-foreground w-full"
                      placeholder="/"
                      disabled={isUploading}
                    />
                  </div>
                </div>
              </div>

              {/* Upload button */}
              <Button
                onClick={handleStartUpload}
                disabled={queuedFiles.length === 0 || isUploading || (!hasKeys && !walletData?.connected)}
                className="w-full h-12 vault-font-display tracking-wider text-sm vault-glow"
                style={{
                  backgroundColor: 'hsl(var(--vault-glow) / 0.2)',
                  borderColor: 'hsl(var(--vault-glow) / 0.5)',
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ENCRYPTING...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    ENCRYPT & UPLOAD ({queuedFiles.length})
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BlockDriveUploadModal;
