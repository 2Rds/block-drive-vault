/**
 * Shared With Me Panel
 * 
 * Displays files that others have shared with the current wallet.
 * Allows accepting delegations and downloading/decrypting shared files.
 * Shows ZK proof status for each shared file.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Download,
  Eye,
  Users,
  User,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Lock,
  FileText,
  ExternalLink,
  Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { zkProofStorageService } from '@/services/zkProofStorageService';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ZKProofStatus = 'valid' | 'invalidated' | 'missing' | 'checking';

interface SharedFileWithDelegation {
  delegation: ParsedDelegation;
  fileRecord: ParsedFileRecord | null;
  proofStatus?: ZKProofStatus;
}

interface SharedWithMePanelProps {
  walletAddress: string;
  signTransaction: (tx: any) => Promise<any>;
  onDownload?: (file: ParsedFileRecord, delegation: ParsedDelegation) => void;
  onPreview?: (file: ParsedFileRecord, delegation: ParsedDelegation) => void;
}

export function SharedWithMePanel({
  walletAddress,
  signTransaction,
  onDownload,
  onPreview
}: SharedWithMePanelProps) {
  const { 
    getIncomingDelegations, 
    getFileRecordByPubkey,
    acceptDelegation,
    isLoading 
  } = useBlockDriveSolana();
  
  const [sharedFiles, setSharedFiles] = useState<SharedFileWithDelegation[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  // Check ZK proof status for a delegation
  const checkProofStatus = useCallback(async (delegation: ParsedDelegation): Promise<ZKProofStatus> => {
    try {
      // Extract proof CID from encryptedFileKey
      const proofCid = new TextDecoder().decode(delegation.encryptedFileKey);
      
      if (!proofCid || proofCid.length < 10) {
        return 'missing';
      }

      // Download and verify the proof
      const result = await zkProofStorageService.downloadProof(proofCid.trim());
      
      if (!result.success || !result.proofPackage) {
        return 'missing';
      }

      // Check if proof has been invalidated
      if (result.proofPackage.walletSignature === 'REVOKED' || 
          result.proofPackage.proofHash.startsWith('INVALIDATED_')) {
        return 'invalidated';
      }

      return 'valid';
    } catch (error) {
      console.error('Failed to check proof status:', error);
      return 'missing';
    }
  }, []);

  // Fetch incoming delegations and their file records
  const fetchSharedFiles = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    try {
      const delegations = await getIncomingDelegations(walletAddress);
      
      // Fetch file records for each delegation (set initial proofStatus to 'checking')
      const filesWithDelegations: SharedFileWithDelegation[] = await Promise.all(
        delegations.map(async (delegation) => {
          const fileRecord = await getFileRecordByPubkey(delegation.fileRecord);
          return { delegation, fileRecord, proofStatus: 'checking' as ZKProofStatus };
        })
      );
      
      setSharedFiles(filesWithDelegations);

      // Check proof status in background
      filesWithDelegations.forEach(async (item, index) => {
        const status = await checkProofStatus(item.delegation);
        setSharedFiles(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = { ...updated[index], proofStatus: status };
          }
          return updated;
        });
      });
    } catch (error) {
      console.error('Failed to fetch shared files:', error);
      toast.error('Failed to load shared files');
    } finally {
      setLoading(false);
    }
  }, [walletAddress, getIncomingDelegations, getFileRecordByPubkey, checkProofStatus]);

  useEffect(() => {
    fetchSharedFiles();
  }, [fetchSharedFiles]);

  const handleAccept = async (delegation: ParsedDelegation) => {
    setAcceptingId(delegation.publicKey.toBase58());
    try {
      await acceptDelegation(
        walletAddress,
        delegation.publicKey.toBase58(),
        signTransaction
      );
      fetchSharedFiles();
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDownload = (file: ParsedFileRecord, delegation: ParsedDelegation) => {
    if (delegation.permissionLevel === 'view') {
      toast.error('View-only permission does not allow downloads');
      return;
    }
    onDownload?.(file, delegation);
    toast.success('Starting download...', {
      description: 'Decrypting file with shared key'
    });
  };

  const handlePreview = (file: ParsedFileRecord, delegation: ParsedDelegation) => {
    onPreview?.(file, delegation);
  };

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case 'view': return <Eye className="w-3 h-3" />;
      case 'download': return <Download className="w-3 h-3" />;
      case 'reshare': return <Users className="w-3 h-3" />;
      default: return <Eye className="w-3 h-3" />;
    }
  };

  const getPermissionLabel = (level: string) => {
    switch (level) {
      case 'view': return 'View Only';
      case 'download': return 'Download';
      case 'reshare': return 'Download & Reshare';
      default: return 'View';
    }
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'view': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'download': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'reshare': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const isExpired = (delegation: ParsedDelegation) => {
    if (!delegation.expiresAt) return false;
    return delegation.expiresAt.getTime() < Date.now();
  };

  // Get ZK proof status indicator
  const getProofStatusBadge = (status: ZKProofStatus | undefined) => {
    switch (status) {
      case 'valid':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs gap-1">
                <ShieldCheck className="w-3 h-3" />
                ZK Valid
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>ZK proof is valid - file can be decrypted</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'invalidated':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs gap-1">
                <ShieldX className="w-3 h-3" />
                Revoked
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Access has been revoked - file cannot be decrypted</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'missing':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs gap-1">
                <ShieldQuestion className="w-3 h-3" />
                No Proof
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>ZK proof not found - file may be inaccessible</p>
            </TooltipContent>
          </Tooltip>
        );
      case 'checking':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground text-xs gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking...
          </Badge>
        );
      default:
        return null;
    }
  };

  const isFileAccessible = (item: SharedFileWithDelegation) => {
    return item.proofStatus === 'valid' && !isExpired(item.delegation);
  };

  if (loading) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="w-5 h-5 text-primary" />
            Shared With Me
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sharedFiles.length === 0) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="w-5 h-5 text-primary" />
            Shared With Me
          </CardTitle>
          <CardDescription>
            Files others have shared with your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No files have been shared with you yet</p>
            <p className="text-sm mt-1 text-muted-foreground/70">
              When someone shares a file with your wallet, it will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-card/40 backdrop-blur-md border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Inbox className="w-5 h-5 text-primary" />
                Shared With Me
                <Badge variant="secondary" className="ml-2">
                  {sharedFiles.length} file{sharedFiles.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Files others have shared with your wallet via on-chain delegation
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSharedFiles}
              disabled={loading}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">End-to-End Encrypted Sharing</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Files are encrypted with keys shared through on-chain delegation. 
                  Only you can decrypt files shared with your wallet.
                </p>
              </div>
            </div>
          </div>

          {/* Shared Files List */}
          <div className="space-y-3">
            {sharedFiles.map((item) => {
              const { delegation, fileRecord, proofStatus } = item;
              const expired = isExpired(delegation);
              const revoked = proofStatus === 'invalidated';
              const accessible = isFileAccessible(item);
              
              return (
                <div 
                  key={delegation.publicKey.toBase58()}
                  className={cn(
                    "bg-card/60 rounded-lg border overflow-hidden transition-all",
                    revoked
                      ? "border-destructive/30 opacity-70"
                      : expired 
                        ? "border-destructive/30 opacity-60" 
                        : "border-border hover:border-primary/30"
                  )}
                >
                  {/* File Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          revoked ? "bg-destructive/10" : expired ? "bg-destructive/10" : "bg-primary/10"
                        )}>
                          {revoked ? (
                            <ShieldX className="w-5 h-5 text-destructive" />
                          ) : expired ? (
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                          ) : (
                            <Lock className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-medium text-foreground">
                              {fileRecord ? `File ID: ${fileRecord.fileId.slice(0, 8)}...` : 'Encrypted File'}
                            </h4>
                            {/* ZK Proof Status Badge */}
                            {getProofStatusBadge(proofStatus)}
                            {delegation.isAccepted && !revoked && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Accepted
                              </Badge>
                            )}
                            {expired && !revoked && (
                              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                                Expired
                              </Badge>
                            )}
                          </div>
                          
                          {/* Grantor Info */}
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              From: <span className="font-mono">{formatAddress(delegation.grantor)}</span>
                            </span>
                          </div>

                          {/* File Details */}
                          {fileRecord && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {(fileRecord.fileSize / 1024).toFixed(1)} KB
                              </span>
                              <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                {fileRecord.securityLevel}
                              </span>
                              {fileRecord.primaryCid && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="flex items-center gap-1 cursor-help">
                                      <ExternalLink className="w-3 h-3" />
                                      IPFS
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-mono text-xs">{fileRecord.primaryCid}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          )}

                          {/* Delegation Details */}
                          <div className="flex items-center gap-3 mt-2">
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs", getPermissionColor(delegation.permissionLevel))}
                            >
                              {getPermissionIcon(delegation.permissionLevel)}
                              <span className="ml-1">{getPermissionLabel(delegation.permissionLevel)}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Shared {format(delegation.createdAt, 'MMM d, yyyy')}
                            </span>
                            {delegation.expiresAt && (
                              <span className={cn(
                                "text-xs flex items-center gap-1",
                                expired ? "text-destructive" : "text-muted-foreground"
                              )}>
                                <Clock className="w-3 h-3" />
                                {expired ? 'Expired' : `Expires ${format(delegation.expiresAt, 'MMM d, yyyy')}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {revoked && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 text-destructive text-sm">
                                <ShieldX className="w-4 h-4" />
                                <span>Access Revoked</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The file owner has revoked your access.</p>
                              <p className="text-xs text-muted-foreground mt-1">The ZK proof has been invalidated.</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {!revoked && !delegation.isAccepted && !expired && proofStatus !== 'checking' && (
                          <Button
                            size="sm"
                            onClick={() => handleAccept(delegation)}
                            disabled={acceptingId === delegation.publicKey.toBase58()}
                            className="gap-2"
                          >
                            {acceptingId === delegation.publicKey.toBase58() ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Accept
                          </Button>
                        )}
                        
                        {!revoked && delegation.isAccepted && fileRecord && !expired && accessible && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreview(fileRecord, delegation)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Preview file</TooltipContent>
                            </Tooltip>
                            
                            {delegation.permissionLevel !== 'view' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownload(fileRecord, delegation)}
                                    className="gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Download
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Download & decrypt file</TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Access Stats Footer */}
                  {delegation.accessCount > 0 && (
                    <div className="px-4 py-2 bg-muted/20 border-t border-border">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Accessed {delegation.accessCount} time{delegation.accessCount !== 1 ? 's' : ''}
                        </span>
                        {delegation.lastAccessedAt && (
                          <span>
                            Last accessed {format(delegation.lastAccessedAt, 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
