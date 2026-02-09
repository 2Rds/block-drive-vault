import React, { useState, useEffect, useCallback } from 'react';
import {
  File,
  Download,
  Archive,
  Globe,
  ArrowLeft,
  Eye,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Link2,
  Lock,
  CheckCircle,
  Clock,
  Trash2,
  Share2,
  MoreVertical,
  RefreshCw,
  Users,
  FolderOpen,
  FolderInput
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { ParsedFileRecord } from '@/services/solana';
import { cn } from '@/lib/utils';
import { TeamFileActions } from './TeamFileActions';

const BYTES_PER_KB = 1024;
const SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB'] as const;
const COMMITMENT_PREVIEW_LENGTH = 8;
const CID_PREVIEW_LENGTH = 12;
const SKELETON_COUNT = 8;

interface BlockDriveFile {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  cid: string;
  uploadedAt: Date;
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  encrypted: boolean;
  folderPath?: string;

  onChain?: {
    registered: boolean;
    verified: boolean;
    fileRecordPubkey?: string;
    encryptionCommitment?: string;
    criticalBytesCommitment?: string;
    providerCount?: number;
    isShared?: boolean;
    delegationCount?: number;
    registeredAt?: Date;
    lastAccessedAt?: Date;
  };
}

export const DRAG_TYPE = 'application/x-blockdrive-file-id';

interface BlockDriveFileGridProps {
  files: BlockDriveFile[];
  selectedFolder?: string;
  currentPath?: string;
  onGoBack?: () => void;
  onFileSelect?: (file: BlockDriveFile) => void;
  onFileDownload?: (file: BlockDriveFile) => void;
  onFileDelete?: (file: BlockDriveFile) => void;
  onFileShare?: (file: BlockDriveFile) => void;
  onFileMove?: (file: BlockDriveFile) => void;
  onFolderNavigate?: (folderPath: string) => void;
  onMoveFileToFolder?: (fileId: string, targetFolderPath: string) => void;
  onDropFilesToFolder?: (files: FileList, targetFolderPath: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  showTeamActions?: boolean;
  isPrivateFile?: boolean;
  onActionComplete?: () => void;
}

export function BlockDriveFileGrid({
  files,
  selectedFolder = 'all',
  currentPath = '/',
  onGoBack,
  onFileSelect,
  onFileDownload,
  onFileDelete,
  onFileShare,
  onFileMove,
  onFolderNavigate,
  onMoveFileToFolder,
  onDropFilesToFolder,
  onRefresh,
  loading = false,
  showTeamActions = false,
  isPrivateFile = false,
  onActionComplete
}: BlockDriveFileGridProps) {
  const { user, walletData } = useAuth();
  const { getUserFiles } = useBlockDriveSolana();
  const [onChainFiles, setOnChainFiles] = useState<ParsedFileRecord[]>([]);
  const [loadingOnChain, setLoadingOnChain] = useState(false);

  const fetchOnChainStatus = useCallback(async () => {
    if (!walletData?.address) return;

    setLoadingOnChain(true);
    try {
      const solanaFiles = await getUserFiles(walletData.address);
      setOnChainFiles(solanaFiles);
    } catch (error) {
      console.error('Failed to fetch on-chain files:', error);
    } finally {
      setLoadingOnChain(false);
    }
  }, [walletData?.address, getUserFiles]);

  useEffect(() => {
    if (walletData?.connected) {
      fetchOnChainStatus();
    }
  }, [walletData?.connected, fetchOnChainStatus]);

  const enrichedFiles = files.map(file => {
    if (file.mimeType === 'application/x-directory') return file;

    const onChainRecord = onChainFiles.find(
      ocf => ocf.primaryCid === file.cid
    );

    if (onChainRecord) {
      return {
        ...file,
        onChain: {
          registered: true,
          verified: true,
          fileRecordPubkey: onChainRecord.publicKey.toBase58(),
          encryptionCommitment: onChainRecord.encryptionCommitment,
          criticalBytesCommitment: onChainRecord.criticalBytesCommitment,
          providerCount: onChainRecord.providerCount,
          isShared: onChainRecord.isShared,
          delegationCount: onChainRecord.delegationCount,
          registeredAt: onChainRecord.createdAt,
          lastAccessedAt: onChainRecord.accessedAt,
        }
      };
    }

    return file;
  });

  const pathFiltered = enrichedFiles.filter(file => {
    const fileFolderPath = file.folderPath || '/';
    return fileFolderPath === currentPath;
  });

  const filteredFiles = selectedFolder === 'all'
    ? pathFiltered
    : pathFiltered.filter(file => {
        const contentType = file.mimeType?.toLowerCase() || '';

        if (selectedFolder === 'documents') {
          return contentType.includes('pdf') ||
                 contentType.includes('document') ||
                 contentType.includes('text');
        }
        if (selectedFolder === 'images') {
          return contentType.startsWith('image/');
        }
        if (selectedFolder === 'videos') {
          return contentType.startsWith('video/');
        }
        if (selectedFolder === 'audio') {
          return contentType.startsWith('audio/');
        }
        if (selectedFolder === 'on-chain') {
          return file.onChain?.registered === true;
        }

        return true;
      });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    const aIsFolder = a.mimeType === 'application/x-directory';
    const bIsFolder = b.mimeType === 'application/x-directory';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });

  const folderEntries = sortedFiles.filter(f => f.mimeType === 'application/x-directory');
  const fileEntries = sortedFiles.filter(f => f.mimeType !== 'application/x-directory');
  const onChainCount = fileEntries.filter(f => f.onChain?.registered).length;
  const encryptedCount = fileEntries.filter(f => f.encrypted).length;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_KB));
    return parseFloat((bytes / Math.pow(BYTES_PER_KB, i)).toFixed(2)) + ' ' + SIZE_UNITS[i];
  };

  const formatDate = (date: Date): string => new Date(date).toLocaleDateString();

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'maximum':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Maximum
          </Badge>
        );
      case 'enhanced':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Enhanced
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Standard
          </Badge>
        );
    }
  };

  const getFileTypeColor = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return 'text-green-400';
    if (mimeType?.startsWith('video/')) return 'text-red-400';
    if (mimeType?.startsWith('audio/')) return 'text-purple-400';
    if (mimeType?.includes('pdf') || mimeType?.includes('document')) return 'text-blue-400';
    return 'text-muted-foreground';
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground/70">
          Please connect your wallet to view your BlockDrive files
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => i + 1).map((i) => (
            <div key={i} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 animate-pulse">
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
    <TooltipProvider>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {currentPath !== '/' && onGoBack && (
              <Button onClick={onGoBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <span className="text-sm text-zinc-400">
              {sortedFiles.length} items
              {onChainCount > 0 && (
                <span className="ml-1 text-blue-400">
                  ({onChainCount} on-chain)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {fileEntries.length > 0 && (
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  {encryptedCount} encrypted
                </Badge>
                <Badge variant="outline" className="bg-transparent border-zinc-700 text-zinc-400 text-xs">
                  <Link2 className="w-3 h-3 mr-1" />
                  {onChainCount} on-chain
                </Badge>
              </div>
            )}
            <Button
              onClick={() => {
                fetchOnChainStatus();
                onRefresh?.();
              }}
              variant="outline"
              size="sm"
              disabled={loadingOnChain}
            >
              <RefreshCw className={cn("w-4 h-4", loadingOnChain && "animate-spin")} />
            </Button>
          </div>
        </div>

        {folderEntries.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Folders
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {folderEntries.map((file) => {
                const folderPath = file.folderPath === '/'
                  ? `/${file.filename}`
                  : `${file.folderPath}/${file.filename}`;
                return (
                  <FolderCard
                    key={file.id}
                    file={file}
                    folderPath={folderPath}
                    formatDate={formatDate}
                    onNavigate={() => onFolderNavigate?.(folderPath)}
                    onDelete={() => onFileDelete?.(file)}
                    onMoveFileHere={(fileId) => onMoveFileToFolder?.(fileId, folderPath)}
                    onDropFilesHere={(droppedFiles) => onDropFilesToFolder?.(droppedFiles, folderPath)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {fileEntries.length > 0 ? (
          <div>
            {folderEntries.length > 0 && (
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">
                Files
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {fileEntries.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onSelect={() => onFileSelect?.(file)}
                  onDownload={() => onFileDownload?.(file)}
                  onDelete={() => onFileDelete?.(file)}
                  onShare={() => onFileShare?.(file)}
                  onMove={() => onFileMove?.(file)}
                  formatFileSize={formatFileSize}
                  formatDate={formatDate}
                  getSecurityBadge={getSecurityBadge}
                  getFileTypeColor={getFileTypeColor}
                  showTeamActions={showTeamActions}
                  isPrivateFile={isPrivateFile}
                  onActionComplete={onActionComplete}
                />
              ))}
            </div>
          </div>
        ) : folderEntries.length === 0 ? (
          <div className="text-center py-16">
            <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">No files found</h3>
            <p className="text-zinc-500">
              {selectedFolder === 'all'
                ? 'Upload files to get started'
                : selectedFolder === 'on-chain'
                ? 'No files have been registered on-chain yet'
                : `No ${selectedFolder} files found`
              }
            </p>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  );
}

interface FolderCardProps {
  file: BlockDriveFile;
  folderPath: string;
  formatDate: (date: Date) => string;
  onNavigate: () => void;
  onDelete: () => void;
  onMoveFileHere?: (fileId: string) => void;
  onDropFilesHere?: (files: FileList) => void;
}

function FolderCard({ file, folderPath, formatDate, onNavigate, onDelete, onMoveFileHere, onDropFilesHere }: FolderCardProps) {
  const [isDragTarget, setIsDragTarget] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragTarget(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragTarget(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragTarget(false);

    const fileId = e.dataTransfer.getData(DRAG_TYPE);
    if (fileId) {
      onMoveFileHere?.(fileId);
      return;
    }

    if (e.dataTransfer.files.length > 0) {
      onDropFilesHere?.(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={cn(
        "bg-zinc-900/50 rounded-xl p-4 border transition-colors group cursor-pointer",
        isDragTarget
          ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
          : "border-zinc-800 hover:border-blue-500/40"
      )}
      onClick={onNavigate}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-start justify-between mb-3">
        <FolderOpen className={cn("w-8 h-8", isDragTarget ? "text-blue-400" : "text-blue-500")} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4 text-zinc-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-foreground text-sm truncate" title={file.filename}>
          {file.filename}
        </h3>
        <p className="text-xs text-zinc-500">Created {formatDate(file.uploadedAt)}</p>
        {isDragTarget && (
          <p className="text-xs text-blue-400 font-medium">Drop here</p>
        )}
      </div>
    </div>
  );
}

interface FileCardProps {
  file: BlockDriveFile;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMove: () => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: Date) => string;
  getSecurityBadge: (level: string) => React.ReactNode;
  getFileTypeColor: (mimeType: string) => string;
  showTeamActions?: boolean;
  isPrivateFile?: boolean;
  onActionComplete?: () => void;
}

function FileCard({
  file,
  onSelect,
  onDownload,
  onDelete,
  onShare,
  onMove,
  formatFileSize,
  formatDate,
  getSecurityBadge,
  getFileTypeColor,
  showTeamActions = false,
  isPrivateFile = false,
  onActionComplete
}: FileCardProps) {
  const iconColor = getFileTypeColor(file.mimeType);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, file.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "bg-zinc-900/50 rounded-xl p-4 border transition-colors group cursor-pointer",
        file.onChain?.registered
          ? "border-green-500/30 hover:border-green-500/50"
          : "border-zinc-800 hover:border-zinc-700"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="relative">
          <File className={cn("w-8 h-8", iconColor)} />
          {file.encrypted && (
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
              <Lock className="w-2.5 h-2.5 text-primary-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {file.onChain?.registered && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "p-1 rounded-full",
                  file.onChain.verified
                    ? "bg-green-500/20"
                    : "bg-amber-500/20"
                )}>
                  {file.onChain.verified ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-400" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {file.onChain.verified
                  ? 'Verified on Solana blockchain'
                  : 'Pending verification'}
              </TooltipContent>
            </Tooltip>
          )}

          {showTeamActions && !isPrivateFile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1 rounded-full bg-purple-500/20">
                  <Users className="w-4 h-4 text-purple-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>Team file - visible to all members</TooltipContent>
            </Tooltip>
          )}

          {showTeamActions ? (
            <TeamFileActions
              file={{
                id: file.id,
                filename: file.filename,
                cid: file.cid,
                visibility: isPrivateFile ? 'private' : 'team'
              }}
              onView={onSelect}
              onDownload={onDownload}
              onShare={file.onChain?.registered ? onShare : undefined}
              onMove={onMove}
              onDelete={onDelete}
              onActionComplete={onActionComplete}
              showTeamActions={true}
              isPrivateFile={isPrivateFile}
            />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelect(); }}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                {file.onChain?.registered && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(); }}>
                  <FolderInput className="w-4 h-4 mr-2" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <h3 className="font-medium text-foreground text-sm truncate" title={file.filename}>
          {file.filename}
        </h3>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        <p className="text-xs text-muted-foreground/70">Uploaded {formatDate(file.uploadedAt)}</p>
      </div>

      <div className="mb-3">
        {getSecurityBadge(file.securityLevel)}
      </div>

      <div className="pt-3 border-t border-zinc-800 space-y-2">
        {file.onChain?.registered ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-400 font-medium">On-Chain</span>
              </div>
              {file.onChain.isShared && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
                  <Share2 className="w-3 h-3 mr-1" />
                  {file.onChain.delegationCount} shared
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Commitment:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-primary/70 font-mono truncate max-w-[100px]">
                    {file.onChain.encryptionCommitment?.slice(0, COMMITMENT_PREVIEW_LENGTH)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-mono text-xs break-all">{file.onChain.encryptionCommitment}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {file.onChain.providerCount && file.onChain.providerCount > 1 && (
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {file.onChain.providerCount} storage providers
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-muted rounded-full"></div>
              <span className="text-xs text-muted-foreground">Off-Chain</span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground/70 cursor-help">
                  <ShieldAlert className="w-3 h-3" />
                  Not verified
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>This file is not registered on the Solana blockchain</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {file.cid && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground/70">CID:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground/70 font-mono truncate max-w-[100px] cursor-help">
                  {file.cid?.slice(0, CID_PREVIEW_LENGTH)}...
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-mono text-xs break-all">{file.cid}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
