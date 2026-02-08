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
  Users
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
  
  // On-chain data (optional, populated from Solana)
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

interface BlockDriveFileGridProps {
  files: BlockDriveFile[];
  selectedFolder?: string;
  currentPath?: string;
  onGoBack?: () => void;
  onFileSelect?: (file: BlockDriveFile) => void;
  onFileDownload?: (file: BlockDriveFile) => void;
  onFileDelete?: (file: BlockDriveFile) => void;
  onFileShare?: (file: BlockDriveFile) => void;
  onRefresh?: () => void;
  loading?: boolean;
  // Organization context
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
  onRefresh,
  loading = false,
  showTeamActions = false,
  isPrivateFile = false,
  onActionComplete
}: BlockDriveFileGridProps) {
  const { user, walletData } = useAuth();
  const { getUserFiles, isLoading: solanaLoading } = useBlockDriveSolana();
  const [onChainFiles, setOnChainFiles] = useState<ParsedFileRecord[]>([]);
  const [loadingOnChain, setLoadingOnChain] = useState(false);

  // Fetch on-chain files for the wallet
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

  // Merge local files with on-chain status
  const enrichedFiles = files.map(file => {
    const onChainRecord = onChainFiles.find(
      ocf => ocf.primaryCid === file.cid
    );

    if (onChainRecord) {
      return {
        ...file,
        onChain: {
          registered: true,
          verified: true, // Verified means we found matching commitment on-chain
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

  // Filter files based on folder
  const filteredFiles = selectedFolder === 'all'
    ? enrichedFiles
    : enrichedFiles.filter(file => {
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
        
        const folderPath = file.folderPath || '/';
        return folderPath.includes(`/${selectedFolder}`);
      });

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
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <div className="text-center py-12">
          <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground/70">
            Please connect your wallet to view your BlockDrive files
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => i + 1).map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border/50 animate-pulse">
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
      <div className="bg-card border border-border/50 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {currentPath !== '/' && onGoBack && (
              <Button
                onClick={onGoBack}
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              {selectedFolder === 'all' ? 'BlockDrive Files' : 
               selectedFolder === 'on-chain' ? 'On-Chain Registered Files' :
               `${selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)} Files`}
              {currentPath !== '/' && (
                <span className="text-sm text-muted-foreground font-normal">
                  {currentPath}
                </span>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {filteredFiles.length} files
              {filteredFiles.filter(f => f.onChain?.registered).length > 0 && (
                <span className="ml-1 text-primary">
                  ({filteredFiles.filter(f => f.onChain?.registered).length} on-chain)
                </span>
              )}
            </span>
            <Button
              onClick={() => {
                fetchOnChainStatus();
                onRefresh?.();
              }}
              variant="outline"
              size="sm"
              disabled={loadingOnChain}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loadingOnChain && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        {filteredFiles.length > 0 && (
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary">
                {filteredFiles.filter(f => f.encrypted).length} Encrypted
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <Link2 className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">
                {filteredFiles.filter(f => f.onChain?.registered).length} On-Chain
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <CheckCircle className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400">
                {filteredFiles.filter(f => f.onChain?.verified).length} Verified
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <Share2 className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400">
                {filteredFiles.filter(f => f.onChain?.isShared).length} Shared
              </span>
            </div>
          </div>
        )}

        {/* File Grid */}
        {filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onSelect={() => onFileSelect?.(file)}
                onDownload={() => onFileDownload?.(file)}
                onDelete={() => onFileDelete?.(file)}
                onShare={() => onFileShare?.(file)}
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
        ) : (
          <div className="text-center py-12">
            <Globe className="w-12 h-12 text-primary/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No files found</h3>
            <p className="text-muted-foreground/70">
              {selectedFolder === 'all' 
                ? 'Upload some files to your BlockDrive storage to get started'
                : selectedFolder === 'on-chain'
                ? 'No files have been registered on-chain yet'
                : `No ${selectedFolder} files found`
              }
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// Individual File Card Component
interface FileCardProps {
  file: BlockDriveFile;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onShare: () => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (date: Date) => string;
  getSecurityBadge: (level: string) => React.ReactNode;
  getFileTypeColor: (mimeType: string) => string;
  // Team actions
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
  formatFileSize,
  formatDate,
  getSecurityBadge,
  getFileTypeColor,
  showTeamActions = false,
  isPrivateFile = false,
  onActionComplete
}: FileCardProps) {
  const iconColor = getFileTypeColor(file.mimeType);

  return (
    <div
      className={cn(
        "bg-card rounded-xl p-4 border transition-colors group cursor-pointer",
        file.onChain?.registered
          ? "border-green-500/30 hover:border-green-500/50"
          : "border-border/50 hover:border-border"
      )}
      onClick={onSelect}
    >
      {/* Header with Icon and Actions */}
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
          {/* On-Chain Status Badge */}
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

          {/* Team Badge for team files */}
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

          {/* Actions - Use TeamFileActions when in org context */}
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
      
      {/* File Info */}
      <div className="space-y-1 mb-3">
        <h3 className="font-medium text-foreground text-sm truncate" title={file.filename}>
          {file.filename}
        </h3>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
        <p className="text-xs text-muted-foreground/70">Uploaded {formatDate(file.uploadedAt)}</p>
      </div>

      {/* Security Level Badge */}
      <div className="mb-3">
        {getSecurityBadge(file.securityLevel)}
      </div>
      
      {/* On-Chain Status Footer */}
      <div className="pt-3 border-t border-border space-y-2">
        {file.onChain?.registered ? (
          <>
            {/* Verified Status */}
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
            
            {/* Commitment Preview */}
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

            {/* Provider Count */}
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
        
        {/* CID Preview */}
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
      </div>
    </div>
  );
}
