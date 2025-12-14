/**
 * Shared Files Panel
 * 
 * Displays files you've shared with others and provides the revolutionary
 * "Instant Revoke" capability - delete the critical 16 bytes to make
 * shared files permanently unreadable.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Trash2,
  Shield,
  ShieldOff,
  AlertTriangle,
  User,
  Clock,
  Eye,
  Download,
  Users,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  Lock
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SharedFile {
  fileRecord: ParsedFileRecord;
  delegations: ParsedDelegation[];
}

interface SharedFilesPanelProps {
  walletAddress: string;
  files: ParsedFileRecord[];
  signTransaction: (tx: any) => Promise<any>;
  onRevoke?: () => void;
}

export function SharedFilesPanel({
  walletAddress,
  files,
  signTransaction,
  onRevoke
}: SharedFilesPanelProps) {
  const { getFileDelegations, revokeDelegation, isLoading } = useBlockDriveSolana();
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [loadingDelegations, setLoadingDelegations] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<{
    file: ParsedFileRecord;
    delegation: ParsedDelegation;
  } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Fetch delegations for all shared files
  const fetchDelegations = useCallback(async () => {
    const sharedFileRecords = files.filter(f => f.isShared);
    if (sharedFileRecords.length === 0) {
      setSharedFiles([]);
      return;
    }

    setLoadingDelegations(true);
    try {
      const results = await Promise.all(
        sharedFileRecords.map(async (file) => {
          const delegations = await getFileDelegations(file.publicKey.toBase58());
          return { fileRecord: file, delegations };
        })
      );
      setSharedFiles(results.filter(r => r.delegations.length > 0));
    } catch (error) {
      console.error('Failed to fetch delegations:', error);
    } finally {
      setLoadingDelegations(false);
    }
  }, [files, getFileDelegations]);

  useEffect(() => {
    fetchDelegations();
  }, [fetchDelegations]);

  const handleRevoke = async () => {
    if (!revokeConfirm) return;

    setIsRevoking(true);
    try {
      const signature = await revokeDelegation(
        walletAddress,
        revokeConfirm.file.publicKey.toBase58(),
        revokeConfirm.delegation.grantee,
        signTransaction
      );

      if (signature) {
        toast.success('Access permanently revoked', {
          description: 'The critical bytes have been deleted. This file is now unreadable to the recipient.'
        });
        fetchDelegations();
        onRevoke?.();
      }
    } finally {
      setIsRevoking(false);
      setRevokeConfirm(null);
    }
  };

  const getPermissionIcon = (level: string | number) => {
    if (level === 'view' || level === 0) return <Eye className="w-3 h-3" />;
    if (level === 'download' || level === 1) return <Download className="w-3 h-3" />;
    if (level === 'reshare' || level === 2) return <Users className="w-3 h-3" />;
    return <Eye className="w-3 h-3" />;
  };

  const getPermissionLabel = (level: string | number) => {
    if (level === 'view' || level === 0) return 'View';
    if (level === 'download' || level === 1) return 'Download';
    if (level === 'reshare' || level === 2) return 'Reshare';
    return 'View';
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (loadingDelegations) {
    return (
      <Card className="bg-card/40 backdrop-blur-md border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Share2 className="w-5 h-5 text-primary" />
            Files You've Shared
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
            <Share2 className="w-5 h-5 text-primary" />
            Files You've Shared
          </CardTitle>
          <CardDescription>
            Share encrypted files with instant revoke capability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>You haven't shared any files yet</p>
            <p className="text-sm mt-1 text-muted-foreground/70">
              When you share files, you'll be able to revoke access instantly
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
                <Share2 className="w-5 h-5 text-primary" />
                Files You've Shared
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Zap className="w-4 h-4 text-amber-400" />
                Instant revoke deletes critical bytes, making files permanently unreadable
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDelegations}
              disabled={loadingDelegations}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loadingDelegations && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revolutionary Feature Banner */}
          <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <ShieldOff className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  Revolutionary "Instant Revoke" Technology
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                    Exclusive
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Unlike traditional file sharing, you maintain complete control. When you revoke access, 
                  the critical 16 bytes are deleted, turning the shared file into permanent garbage data. 
                  <strong className="text-foreground"> Even if they downloaded it, they can never decrypt it again.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Shared Files List */}
          {sharedFiles.map((sharedFile) => (
            <div 
              key={sharedFile.fileRecord.publicKey.toBase58()} 
              className="bg-card/60 rounded-lg border border-border overflow-hidden"
            >
              {/* File Header */}
              <div className="p-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Lock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        Encrypted File
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {sharedFile.fileRecord.fileId.slice(0, 16)}...
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                    <Users className="w-3 h-3 mr-1" />
                    {sharedFile.delegations.length} recipient{sharedFile.delegations.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>

              {/* Delegations List */}
              <div className="divide-y divide-border">
                {sharedFile.delegations.map((delegation) => (
                  <div 
                    key={delegation.publicKey.toBase58()}
                    className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground">
                            {formatAddress(delegation.grantee)}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs">
                                {getPermissionIcon(delegation.permissionLevel)}
                                <span className="ml-1">{getPermissionLabel(delegation.permissionLevel)}</span>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Permission level granted to this wallet
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Shared {format(delegation.createdAt, 'MMM d, yyyy')}
                          </span>
                          {delegation.expiresAt && delegation.expiresAt.getTime() > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires {format(delegation.expiresAt, 'MMM d, yyyy')}
                            </span>
                          )}
                          {delegation.accessCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {delegation.accessCount} accesses
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Revoke Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setRevokeConfirm({
                            file: sharedFile.fileRecord,
                            delegation
                          })}
                          className="gap-2"
                        >
                          <ShieldOff className="w-4 h-4" />
                          Instant Revoke
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete critical bytes - file becomes permanently unreadable</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeConfirm} onOpenChange={() => setRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Revoke Access Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to revoke access for wallet{' '}
                <span className="font-mono text-foreground">
                  {revokeConfirm && formatAddress(revokeConfirm.delegation.grantee)}
                </span>
              </p>
              
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldOff className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">This action is irreversible</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      The critical 16 bytes will be permanently deleted from the blockchain. 
                      Even if the recipient has already downloaded the file, they will never be able 
                      to decrypt it again. The file becomes permanent garbage data.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>This is BlockDrive's revolutionary security feature</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Revoke Access Forever
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
