/**
 * BlockDrive Upload Area
 * 
 * Enhanced upload component that uses the unified BlockDrive encryption
 * and multi-provider storage system with Solana on-chain registration.
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Plus,
  Globe,
  Shield,
  Zap,
  CheckCircle,
  Key,
  Lock,
  AlertCircle,
  Link2,
  Users,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CreateFolderModal } from '../CreateFolderModal';
import { SubscriptionGate } from '../SubscriptionGate';
import { CryptoSetupModal } from '../crypto/CryptoSetupModal';
import { useBlockDriveUpload } from '@/hooks/useBlockDriveUpload';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@clerk/clerk-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { DEFAULT_STORAGE_CONFIG } from '@/types/storageProvider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BlockDriveUploadAreaProps {
  onCreateFolder?: (folderName: string) => void;
  selectedFolder?: string;
  onUploadComplete?: () => void;
  signTransaction?: (tx: any) => Promise<any>;
}

export function BlockDriveUploadArea({
  onCreateFolder,
  selectedFolder,
  onUploadComplete,
  signTransaction
}: BlockDriveUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCryptoSetup, setShowCryptoSetup] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Upload settings - simplified, defaults only
  const [vaultExists, setVaultExists] = useState<boolean | null>(null);
  const [initializingVault, setInitializingVault] = useState(false);
  const [shareWithTeam, setShareWithTeam] = useState(true);

  // Fixed settings: Level 2 (Programmed Incompleteness) and default storage config
  const securityLevel = SecurityLevel.SENSITIVE; // Level 2 - Programmed Incompleteness
  const storageConfig = DEFAULT_STORAGE_CONFIG;
  const enableOnChain = true; // Always enabled

  const { user, walletData } = useAuth();
  const { organization } = useOrganization();
  const isInOrganization = !!organization;
  const {
    isUploading,
    progress,
    hasKeys,
    uploadFiles,
    initializeVault,
    checkVaultExists,
    solanaLoading
  } = useBlockDriveUpload({ enableOnChainRegistration: enableOnChain });

  // Check vault status on mount
  useEffect(() => {
    if (walletData?.connected && hasKeys) {
      checkVaultExists().then(setVaultExists);
    }
  }, [walletData?.connected, hasKeys, checkVaultExists]);

  const handleInitializeVault = async () => {
    if (!signTransaction) {
      toast.error('Wallet signing not available');
      return;
    }
    
    setInitializingVault(true);
    try {
      const success = await initializeVault(signTransaction);
      if (success) {
        setVaultExists(true);
        toast.success('Vault initialized on Solana');
      }
    } finally {
      setInitializingVault(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check if keys are initialized
    if (!hasKeys) {
      setShowCryptoSetup(true);
      return;
    }

    // If in organization, show destination modal
    if (isInOrganization) {
      setPendingFiles(files);
      setShowDestinationModal(true);
      return;
    }

    // Not in organization - upload directly to personal files
    await processUpload(files, false);
  };

  const processUpload = async (files: FileList, toTeam: boolean) => {
    setShareWithTeam(toTeam);
    setShowDestinationModal(false);

    // Check if vault needs initialization for on-chain
    if (enableOnChain && !vaultExists && signTransaction) {
      toast.info('Initializing your vault first...');
      const success = await initializeVault(signTransaction);
      if (!success) {
        toast.error('Could not initialize vault. Uploading without on-chain registration.');
      } else {
        setVaultExists(true);
      }
    }

    const folderPath = selectedFolder && selectedFolder !== 'all' ? `/${selectedFolder}` : '/';

    const results = await uploadFiles(
      files,
      securityLevel,
      storageConfig,
      folderPath,
      enableOnChain && signTransaction ? signTransaction : undefined
    );

    if (results.length > 0 && onUploadComplete) {
      onUploadComplete();
    }

    setPendingFiles(null);
  };

  const handleDestinationSelect = (toTeam: boolean) => {
    if (pendingFiles) {
      processUpload(pendingFiles, toTeam);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleCryptoSetupComplete = () => {
    setShowCryptoSetup(false);
  };

  // Not logged in state
  if (!user) {
    return (
      <div className="bg-card rounded-xl border-2 border-dashed border-border/50 p-8 text-center">
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-muted rounded-full">
              <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Connect Your Wallet
            </h3>
            <p className="text-muted-foreground">
              Connect your Web3 wallet to start uploading encrypted files to BlockDrive
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Need to initialize crypto
  if (!hasKeys && walletData?.connected) {
    return (
      <>
        <div className="bg-primary/5 rounded-xl border-2 border-dashed border-primary/30 p-8 text-center">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-primary/10 rounded-full">
                <Key className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Set Up Your Encryption Keys
              </h3>
              <p className="text-muted-foreground mb-4">
                Sign 3 messages to generate your personal encryption keys. This is a one-time setup that enables secure file storage.
              </p>
              <Button 
                onClick={() => setShowCryptoSetup(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Key className="w-4 h-4 mr-2" />
                Initialize Keys
              </Button>
            </div>
          </div>
        </div>
        
        <CryptoSetupModal
          isOpen={showCryptoSetup}
          onClose={() => setShowCryptoSetup(false)}
          onComplete={handleCryptoSetupComplete}
        />
      </>
    );
  }

  const getUploadPhaseColor = () => {
    if (progress?.phase === 'error') return 'border-destructive/50 bg-destructive/10';
    if (progress?.phase === 'complete') return 'border-green-500/50 bg-green-500/10';
    if (isUploading) return 'border-primary/50 bg-primary/10';
    if (dragOver) return 'border-primary bg-primary/20 scale-[1.02]';
    return 'border-border hover:border-primary/50';
  };

  const getProgressLabel = () => {
    switch (progress?.phase) {
      case 'encrypting': return 'Encrypting...';
      case 'uploading': return 'Uploading...';
      case 'registering': return 'Registering on Solana...';
      default: return '';
    }
  };

  return (
    <SubscriptionGate>
      <div className="space-y-4">
        {/* Vault Status Banner */}
        {enableOnChain && vaultExists === false && signTransaction && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-foreground">Solana Vault Not Initialized</p>
                <p className="text-xs text-muted-foreground">Initialize to register files on-chain</p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={handleInitializeVault}
              disabled={initializingVault || solanaLoading}
            >
              {initializingVault ? 'Initializing...' : 'Initialize Vault'}
            </Button>
          </div>
        )}

        {(vaultExists && enableOnChain || isInOrganization) && (
          <div className="flex items-center gap-2">
            {vaultExists && enableOnChain && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Solana Vault Active
              </Badge>
            )}
            {isInOrganization && (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                <Users className="w-3 h-3 mr-1" />
                {organization.name}
              </Badge>
            )}
          </div>
        )}

        {/* Main Upload Area */}
        <div
          className={cn(
            "bg-card rounded-xl border-2 border-dashed transition-all duration-300 p-8",
            getUploadPhaseColor()
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-6 text-center">
            {/* Icon */}
            <div className="flex justify-center">
              <div className={cn(
                "p-4 rounded-full transition-all",
                progress?.phase === 'error' ? 'bg-destructive/20' :
                progress?.phase === 'complete' ? 'bg-green-500/20' :
                isUploading ? 'bg-primary/20 animate-pulse' :
                'bg-primary/10'
              )}>
                {progress?.phase === 'error' ? (
                  <AlertCircle className="w-8 h-8 text-destructive" />
                ) : progress?.phase === 'complete' ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : progress?.phase === 'registering' ? (
                  <Link2 className="w-8 h-8 text-primary animate-pulse" />
                ) : isUploading ? (
                  <Zap className="w-8 h-8 text-primary animate-pulse" />
                ) : (
                  <Upload className="w-8 h-8 text-primary" />
                )}
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                {progress?.phase === 'complete' ? 'Upload Complete!' :
                 progress?.phase === 'error' ? 'Upload Failed' :
                 progress?.phase === 'registering' ? 'Registering On-Chain...' :
                 isUploading ? 'Encrypting & Uploading...' :
                 'Encrypted BlockDrive Upload'}
              </h3>
              <p className="text-muted-foreground">
                {progress?.message || 'Files are encrypted with your wallet and stored across multiple providers'}
              </p>
            </div>

            {/* Features */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-primary" />
                AES-256 Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4 text-primary" />
                Multi-Provider
              </span>
              <span className="flex items-center gap-1">
                <Key className="w-4 h-4 text-primary" />
                Wallet-Derived Keys
              </span>
              {enableOnChain && (
                <span className="flex items-center gap-1">
                  <Link2 className="w-4 h-4 text-primary" />
                  Solana Registered
                </span>
              )}
            </div>

            {/* Progress */}
            {isUploading && progress && (
              <div className="space-y-3 max-w-md mx-auto">
                <Progress value={progress.progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {getProgressLabel()} <span className="font-mono">{Math.round(progress.progress)}%</span>
                </p>
              </div>
            )}

            {/* Actions */}
            {!isUploading && (
              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Files
                </Button>
                <Button
                  onClick={() => setShowCreateFolderModal(true)}
                  variant="outline"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Folder
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept="*/*"
            />

            {!isUploading && (
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or click to browse
              </p>
            )}
          </div>
        </div>

        {/* Upload Destination Modal - shown when in organization */}
        <Dialog open={showDestinationModal} onOpenChange={setShowDestinationModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Where would you like to upload?</DialogTitle>
              <DialogDescription>
                Choose whether to share files with your team or keep them private.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6 hover:bg-purple-500/10 hover:border-purple-500/50"
                onClick={() => handleDestinationSelect(true)}
              >
                <Users className="w-8 h-8 text-purple-400" />
                <div className="text-center">
                  <div className="font-semibold">Team Files</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Visible to {organization?.name} members
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto flex-col gap-3 p-6 hover:bg-primary/10 hover:border-primary/50"
                onClick={() => handleDestinationSelect(false)}
              >
                <User className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <div className="font-semibold">My Files</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Private to you only
                  </div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <CreateFolderModal
          isOpen={showCreateFolderModal}
          onClose={() => setShowCreateFolderModal(false)}
          onCreateFolder={(name) => {
            onCreateFolder?.(name);
            setShowCreateFolderModal(false);
          }}
        />

        <CryptoSetupModal
          isOpen={showCryptoSetup}
          onClose={() => setShowCryptoSetup(false)}
          onComplete={handleCryptoSetupComplete}
        />
      </div>
    </SubscriptionGate>
  );
}
