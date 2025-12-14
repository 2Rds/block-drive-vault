/**
 * BlockDrive Upload Area
 * 
 * Enhanced upload component that uses the unified BlockDrive encryption
 * and multi-provider storage system.
 */

import React, { useRef, useState } from 'react';
import { 
  Upload, 
  Plus, 
  Globe, 
  Shield, 
  Zap, 
  CheckCircle, 
  Key, 
  Lock,
  Settings,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CreateFolderModal } from '../CreateFolderModal';
import { SubscriptionGate } from '../SubscriptionGate';
import { CryptoSetupModal } from '../crypto/CryptoSetupModal';
import { SecurityLevelSelector } from '../crypto/SecurityLevelSelector';
import { StorageConfigSelector } from '../storage/StorageConfigSelector';
import { StorageHealthIndicator } from '../storage/StorageHealthIndicator';
import { useBlockDriveUpload } from '@/hooks/useBlockDriveUpload';
import { useStorageOrchestrator } from '@/hooks/useStorageOrchestrator';
import { useAuth } from '@/hooks/useAuth';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { DEFAULT_STORAGE_CONFIG, StorageConfig } from '@/types/storageProvider';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BlockDriveUploadAreaProps {
  onCreateFolder?: (folderName: string) => void;
  selectedFolder?: string;
  onUploadComplete?: () => void;
}

export function BlockDriveUploadArea({ 
  onCreateFolder, 
  selectedFolder, 
  onUploadComplete 
}: BlockDriveUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showCryptoSetup, setShowCryptoSetup] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Upload settings
  const [securityLevel, setSecurityLevel] = useState<SecurityLevel>(SecurityLevel.STANDARD);
  const [storageConfig, setStorageConfig] = useState<StorageConfig>(DEFAULT_STORAGE_CONFIG);
  
  const { user, session, walletData } = useAuth();
  const { 
    isUploading, 
    isInitialized, 
    progress, 
    hasKeys,
    initializeCrypto,
    uploadFiles 
  } = useBlockDriveUpload();
  const { healthStatus, refreshHealth } = useStorageOrchestrator();

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if keys are initialized
    if (!hasKeys) {
      setShowCryptoSetup(true);
      return;
    }
    
    const folderPath = selectedFolder && selectedFolder !== 'all' ? `/${selectedFolder}` : '/';
    
    const results = await uploadFiles(files, securityLevel, storageConfig, folderPath);
    
    if (results.length > 0 && onUploadComplete) {
      onUploadComplete();
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
      <div className="bg-card/40 backdrop-blur-md rounded-xl border-2 border-dashed border-border p-8 text-center">
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
        <div className="bg-primary/5 backdrop-blur-md rounded-xl border-2 border-dashed border-primary/30 p-8 text-center">
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

  return (
    <SubscriptionGate>
      <div className="space-y-4">
        {/* Main Upload Area */}
        <div
          className={cn(
            "bg-card/40 backdrop-blur-md rounded-xl border-2 border-dashed transition-all duration-300 p-8",
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
                 isUploading ? 'Encrypting & Uploading...' :
                 'Encrypted BlockDrive Upload'}
              </h3>
              <p className="text-muted-foreground">
                {progress?.message || 'Files are encrypted with your wallet and stored across multiple providers'}
              </p>
            </div>

            {/* Features */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
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
            </div>

            {/* Progress */}
            {isUploading && progress && (
              <div className="space-y-3 max-w-md mx-auto">
                <Progress value={progress.progress} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {progress.phase === 'encrypting' ? 'Encrypting...' : 
                   progress.phase === 'uploading' ? 'Uploading...' : ''}
                  {' '}{Math.round(progress.progress)}%
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
                  <Plus className="w-5 h-5 mr-2" />
                  Choose Files
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

        {/* Advanced Settings */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Settings
              </span>
              <span className="text-muted-foreground">
                {showAdvanced ? '▲' : '▼'}
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Security Level */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Security Level
              </label>
              <SecurityLevelSelector
                value={securityLevel}
                onChange={setSecurityLevel}
                disabled={isUploading}
              />
            </div>

            {/* Storage Config */}
            <StorageConfigSelector
              value={storageConfig}
              onChange={setStorageConfig}
              disabled={isUploading}
            />

            {/* Provider Health */}
            <StorageHealthIndicator
              healthStatus={healthStatus}
              onRefresh={refreshHealth}
            />
          </CollapsibleContent>
        </Collapsible>

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
