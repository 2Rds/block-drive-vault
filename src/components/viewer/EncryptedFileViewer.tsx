/**
 * Encrypted File Viewer
 * 
 * Enhanced file viewer that decrypts BlockDrive files using
 * wallet-derived keys and verifies commitment hashes.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  File, 
  Lock, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Loader2,
  Key,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { IPFSFile } from '@/types/ipfs';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { FileRecordData } from '@/services/blockDriveDownloadService';
import { useBlockDriveDownload } from '@/hooks/useBlockDriveDownload';
import { cn } from '@/lib/utils';

interface EncryptedFileViewerProps {
  file: IPFSFile;
  fileRecord?: FileRecordData;
  onClose: () => void;
}

const SECURITY_LEVEL_INFO = {
  [SecurityLevel.STANDARD]: {
    label: 'Standard',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  [SecurityLevel.SENSITIVE]: {
    label: 'Sensitive',
    icon: Lock,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  [SecurityLevel.MAXIMUM]: {
    label: 'Maximum',
    icon: Key,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  }
};

export function EncryptedFileViewer({ 
  file, 
  fileRecord,
  onClose 
}: EncryptedFileViewerProps) {
  const { 
    isDownloading, 
    progress, 
    downloadAndSave, 
    previewFile,
    hasKeys 
  } = useBlockDriveDownload();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'failed'>('pending');

  // Determine if file is encrypted (has BlockDrive metadata)
  const isEncrypted = fileRecord || (file as any).metadata?.blockdrive === 'true';
  const securityLevel = fileRecord?.securityLevel || SecurityLevel.STANDARD;
  const levelInfo = SECURITY_LEVEL_INFO[securityLevel];
  const LevelIcon = levelInfo.icon;

  const isImage = file.contentType?.startsWith('image/');
  const isVideo = file.contentType?.startsWith('video/');
  const isAudio = file.contentType?.startsWith('audio/');
  const isPDF = file.contentType?.includes('pdf');
  const canPreview = isImage || isVideo || isAudio || isPDF;

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleDecryptAndPreview = async () => {
    if (!fileRecord) {
      // Fall back to direct URL for non-encrypted files
      setPreviewUrl(`https://ipfs.filebase.io/ipfs/${file.cid}`);
      setPreviewType(file.contentType || 'application/octet-stream');
      setIsDecrypted(true);
      return;
    }

    const result = await previewFile(fileRecord);
    if (result) {
      setPreviewUrl(result.url);
      setPreviewType(result.type);
      setIsDecrypted(true);
      setVerificationStatus('verified');
    } else {
      setVerificationStatus('failed');
    }
  };

  const handleDownload = async () => {
    if (fileRecord) {
      await downloadAndSave(fileRecord);
    } else {
      // Direct download for non-encrypted files
      window.open(`https://ipfs.filebase.io/ipfs/${file.cid}`, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-4xl max-h-[90vh] w-full overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg", levelInfo.bgColor)}>
              <LevelIcon className={cn("w-5 h-5", levelInfo.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-foreground">{file.filename}</h3>
                {isEncrypted && (
                  <Badge variant="secondary" className={cn(levelInfo.bgColor, levelInfo.color)}>
                    <Lock className="w-3 h-3 mr-1" />
                    {levelInfo.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {file.contentType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEncrypted && (
              <Button
                onClick={() => window.open(`https://ipfs.filebase.io/ipfs/${file.cid}`, '_blank')}
                variant="outline"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on IPFS
              </Button>
            )}
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              disabled={isDownloading}
              className="bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isEncrypted ? 'Decrypt & Download' : 'Download'}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        {isDownloading && progress && (
          <div className="px-4 py-3 bg-muted/50 border-b border-border">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">{progress.message}</span>
              <span className="text-foreground">{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-auto max-h-[calc(90vh-180px)]">
          {/* Encrypted file - needs decryption first */}
          {isEncrypted && !isDecrypted && (
            <div className="text-center py-12">
              <div className={cn("inline-flex p-4 rounded-full mb-4", levelInfo.bgColor)}>
                <Lock className={cn("w-12 h-12", levelInfo.color)} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Encrypted File
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                This file is encrypted with {levelInfo.label} security. 
                {canPreview 
                  ? ' Decrypt to preview the content.' 
                  : ' Click download to decrypt and save.'}
              </p>
              
              {!hasKeys ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center gap-2 text-amber-500 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Keys Not Initialized</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You need to initialize your encryption keys before you can decrypt files.
                  </p>
                </div>
              ) : canPreview ? (
                <Button 
                  onClick={handleDecryptAndPreview}
                  disabled={isDownloading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Decrypt & Preview
                </Button>
              ) : (
                <Button 
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Decrypt & Download
                </Button>
              )}

              {/* File Details */}
              <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border max-w-md mx-auto text-left">
                <h4 className="font-medium text-foreground mb-3">File Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Security Level:</span>
                    <span className={levelInfo.color}>{levelInfo.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="text-foreground">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="text-foreground">{file.contentType}</span>
                  </div>
                  {fileRecord?.commitment && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-muted-foreground">Commitment:</span>
                      <p className="font-mono text-xs text-foreground mt-1 break-all">
                        {fileRecord.commitment}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Decrypted content */}
          {(isDecrypted || !isEncrypted) && (
            <>
              {/* Verification status for decrypted files */}
              {isEncrypted && isDecrypted && (
                <div className={cn(
                  "flex items-center gap-2 p-3 rounded-lg mb-4",
                  verificationStatus === 'verified' 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-red-500/10 text-red-500"
                )}>
                  {verificationStatus === 'verified' ? (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>File decrypted and commitment verified</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5" />
                      <span>Warning: Commitment verification failed</span>
                    </>
                  )}
                </div>
              )}

              {/* Preview content */}
              {isImage && previewUrl && (
                <div className="flex justify-center">
                  <img
                    src={previewUrl}
                    alt={file.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              )}

              {isVideo && previewUrl && (
                <div className="flex justify-center">
                  <video
                    controls
                    className="max-w-full max-h-[60vh] rounded-lg"
                  >
                    <source src={previewUrl} type={previewType} />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {isAudio && previewUrl && (
                <div className="flex justify-center py-8">
                  <audio controls className="w-full max-w-md">
                    <source src={previewUrl} type={previewType} />
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}

              {isPDF && previewUrl && (
                <div className="w-full h-[60vh]">
                  <iframe
                    src={previewUrl}
                    className="w-full h-full rounded-lg border border-border"
                    title={file.filename}
                  />
                </div>
              )}

              {!canPreview && (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Preview not available for this file type
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Click download to save the decrypted file
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
