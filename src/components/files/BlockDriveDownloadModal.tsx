/**
 * BlockDriveDownloadModal
 *
 * Download interface with decryption visualization and commitment verification.
 * Part of the Vault Terminal design system.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Download,
  FileIcon,
  ShieldCheck,
  ShieldAlert,
  Link2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
  Eye,
  Loader2,
  Key,
} from 'lucide-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { FileRecordData } from '@/services/blockDriveDownloadService';
import { useBlockDriveDownload } from '@/hooks/useBlockDriveDownload';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { CryptoSetupModal } from '@/components/crypto/CryptoSetupModal';
import { SecurityLevelRing } from './SecurityLevelRing';
import { EncryptionPhaseIndicator } from './EncryptionPhaseIndicator';
import { DataBlockAnimation } from './DataBlockAnimation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BlockDriveDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileRecord: FileRecordData | null;
  autoStart?: boolean;
}

export function BlockDriveDownloadModal({
  isOpen,
  onClose,
  fileRecord,
  autoStart = false,
}: BlockDriveDownloadModalProps) {
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'complete' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cryptoSetupOpen, setCryptoSetupOpen] = useState(false);
  const [pendingDownload, setPendingDownload] = useState(false);

  const {
    downloadAndSave,
    previewFile,
    progress,
    isDownloading,
    lastDownload,
    hasKeys,
  } = useBlockDriveDownload();

  const { state: cryptoState } = useWalletCrypto();

  // Auto-start download if requested
  useEffect(() => {
    if (isOpen && autoStart && fileRecord && hasKeys && downloadState === 'idle') {
      handleDownload();
    }
  }, [isOpen, autoStart, fileRecord, hasKeys]);

  // Clean up preview URL on close
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // After crypto setup completes, auto-start the pending download
  const handleCryptoSetupComplete = () => {
    setCryptoSetupOpen(false);
    if (pendingDownload) {
      setPendingDownload(false);
      startDownload();
    }
  };

  // Actually perform the download (keys must be ready)
  const startDownload = async () => {
    if (!fileRecord) return;

    setDownloadState('downloading');

    try {
      const success = await downloadAndSave(fileRecord);
      setDownloadState(success ? 'complete' : 'error');
    } catch (error) {
      setDownloadState('error');
      toast.error(error instanceof Error ? error.message : 'Download failed');
    }
  };

  // Handle download button click
  const handleDownload = async () => {
    if (!fileRecord) return;

    if (!hasKeys) {
      setPendingDownload(true);
      setCryptoSetupOpen(true);
      return;
    }

    startDownload();
  };

  // Handle preview
  const handlePreview = async () => {
    if (!fileRecord) return;

    if (!hasKeys) {
      setCryptoSetupOpen(true);
      return;
    }

    setDownloadState('downloading');

    try {
      const result = await previewFile(fileRecord);
      if (result) {
        setPreviewUrl(result.url);
        setDownloadState('complete');
      } else {
        setDownloadState('error');
      }
    } catch (error) {
      setDownloadState('error');
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Get security level from record
  const getSecurityLevel = (): SecurityLevel => {
    if (!fileRecord) return SecurityLevel.STANDARD;
    if (typeof fileRecord.securityLevel === 'number') {
      return fileRecord.securityLevel;
    }
    // Handle string values
    const levelStr = String(fileRecord.securityLevel).toLowerCase();
    if (levelStr.includes('maximum') || levelStr === '3') return SecurityLevel.MAXIMUM;
    if (levelStr.includes('sensitive') || levelStr.includes('enhanced') || levelStr === '2') return SecurityLevel.SENSITIVE;
    return SecurityLevel.STANDARD;
  };

  // Get animation phase
  const getAnimationPhase = () => {
    if (!progress) return 'idle';
    if (progress.phase === 'decrypting') return 'reassembling';
    if (progress.phase === 'complete') return 'complete';
    return 'fragmenting';
  };

  // Reset modal state on close
  const handleClose = () => {
    if (!isDownloading) {
      setDownloadState('idle');
      setCryptoSetupOpen(false);
      setPendingDownload(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      onClose();
    }
  };

  if (!fileRecord) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] bg-card/95 backdrop-blur-xl border-primary/20 overflow-hidden">
        {/* Scan line effect */}
        <div className="vault-scan-line" />

        <DialogHeader>
          <DialogTitle className="vault-font-display text-xl tracking-wide flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center vault-glow"
              style={{ backgroundColor: 'hsl(var(--vault-glow) / 0.2)' }}
            >
              <Download className="w-5 h-5 text-primary" />
            </div>
            SECURE DOWNLOAD
          </DialogTitle>
          <DialogDescription className="vault-font-mono text-xs text-muted-foreground">
            Decrypt and verify file integrity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Keys not initialized warning */}
          {!hasKeys && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <Key className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm text-amber-400 font-medium">Decryption Keys Required</p>
                <p className="text-xs text-muted-foreground">
                  Answer your security question to unlock decryption keys
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setCryptoSetupOpen(true)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/30"
              >
                Unlock
              </Button>
            </div>
          )}

          {/* Download in progress */}
          {isDownloading && progress ? (
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
                variant="download"
              />
            </div>
          ) : downloadState === 'complete' && lastDownload ? (
            /* Download complete view */
            <div className="space-y-6">
              {/* Success header */}
              <div className="text-center py-4">
                <div
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 vault-glow-success"
                  style={{ backgroundColor: 'hsl(var(--vault-success) / 0.2)' }}
                >
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="vault-font-display text-lg text-green-400">DOWNLOAD COMPLETE</h3>
              </div>

              {/* Verification status */}
              <div className="space-y-3">
                <div
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    lastDownload.commitmentValid
                      ? 'border-green-500/30 bg-green-500/10'
                      : 'border-red-500/30 bg-red-500/10'
                  )}
                >
                  {lastDownload.commitmentValid ? (
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      lastDownload.commitmentValid ? 'text-green-400' : 'text-red-400'
                    )}>
                      {lastDownload.commitmentValid
                        ? 'Commitment Verified'
                        : 'Commitment Mismatch'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lastDownload.commitmentValid
                        ? 'File integrity confirmed on-chain'
                        : 'Warning: Data may have been tampered with'}
                    </p>
                  </div>
                </div>

                {/* File info */}
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3 mb-2">
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="vault-font-mono text-sm truncate flex-1">
                      {lastDownload.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{formatSize(lastDownload.fileSize)}</span>
                    <span>{lastDownload.fileType}</span>
                  </div>
                </div>
              </div>

              {/* Preview if available */}
              {previewUrl && lastDownload.fileType.startsWith('image/') && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={previewUrl}
                    alt={lastDownload.fileName}
                    className="w-full h-auto max-h-[200px] object-contain bg-black"
                  />
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          ) : (
            /* File info and download button */
            <>
              {/* File info card */}
              <div className="relative p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-4">
                  {/* Security level ring */}
                  <SecurityLevelRing
                    level={getSecurityLevel()}
                    size="md"
                    active={false}
                  />

                  {/* File details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="vault-font-mono text-sm font-medium truncate mb-1">
                      {fileRecord.fileName || 'Encrypted File'}
                    </h3>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{formatSize(fileRecord.fileSize || 0)}</p>
                      <p>{fileRecord.mimeType || 'Unknown type'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* On-chain info */}
              {fileRecord.commitment && (
                <div className="space-y-3">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider">
                    On-Chain Data
                  </h4>

                  {/* Commitment */}
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                    <Link2 className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-cyan-400 font-medium mb-1">Commitment Hash</p>
                      <p className="vault-font-mono text-xs text-muted-foreground truncate">
                        {fileRecord.commitment}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(fileRecord.commitment!, 'Commitment')}
                      className="p-1 hover:bg-cyan-500/20 rounded"
                    >
                      <Copy className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>

                  {/* CID */}
                  {fileRecord.contentCID && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      <FileIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Content CID</p>
                        <p className="vault-font-mono text-xs text-muted-foreground/70 truncate">
                          {fileRecord.contentCID}
                        </p>
                      </div>
                      <a
                        href={`https://ipfs.io/ipfs/${fileRecord.contentCID}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-muted rounded"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Preview button (for images/videos) */}
                {fileRecord.mimeType?.startsWith('image/') && (
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={isDownloading}
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                )}

                {/* Download button */}
                <Button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className={cn(
                    'flex-1 h-12 vault-font-display tracking-wider text-sm',
                    !fileRecord.mimeType?.startsWith('image/') && 'w-full'
                  )}
                  style={{
                    backgroundColor: 'hsl(var(--vault-glow) / 0.2)',
                    borderColor: 'hsl(var(--vault-glow) / 0.5)',
                  }}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      DECRYPTING...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      DECRYPT & DOWNLOAD
                    </>
                  )}
                </Button>
              </div>

              {/* Error state */}
              {downloadState === 'error' && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                  <XCircle className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">Download Failed</p>
                    <p className="text-xs text-muted-foreground">
                      Please check your connection and try again
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="ml-auto text-red-400 hover:text-red-300"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>

      <CryptoSetupModal
        isOpen={cryptoSetupOpen}
        onClose={() => {
          setCryptoSetupOpen(false);
          setPendingDownload(false);
        }}
        onComplete={handleCryptoSetupComplete}
      />
    </Dialog>
  );
}
