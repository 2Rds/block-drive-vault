
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { IPFSFileGrid } from "@/components/IPFSFileGrid";
import { BlockDriveFileGrid } from "@/components/files/BlockDriveFileGrid";
import { ShareFileModal } from "@/components/files/ShareFileModal";
import { SharedFilesPanel } from "@/components/files/SharedFilesPanel";
import { SharedWithMePanel } from "@/components/files/SharedWithMePanel";
import { BlockDriveUploadArea } from "@/components/upload/BlockDriveUploadArea";
import { BlockDriveDownloadModal } from "@/components/files/BlockDriveDownloadModal";
import { EncryptedFileViewer } from "@/components/viewer/EncryptedFileViewer";
import { CryptoSetupModal } from "@/components/crypto/CryptoSetupModal";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Settings, Files, Puzzle, Users, Crown, Lock, Link2, Globe, Share2, Inbox } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useAuth } from '@/hooks/useAuth';
import { useBlockDriveSolana } from '@/hooks/useBlockDriveSolana';
import { useSolanaWalletSigning } from '@/hooks/useSolanaWalletSigning';
import { useSharedFileDownload } from '@/hooks/useSharedFileDownload';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { FileRecordData } from '@/services/blockDriveDownloadService';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { toast } from 'sonner';

const IPFSFiles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { walletData } = useAuth();
  const { getUserFiles } = useBlockDriveSolana();
  const { signTransaction } = useSolanaWalletSigning();
  const { downloadAndSave, previewSharedFile } = useSharedFileDownload();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { state: cryptoState, isSessionValid, initializeKeys } = useWalletCrypto();
  const { 
    currentPath, 
    openFolders, 
    selectedFile,
    showFileViewer,
    toggleFolder,
    selectFile,
    closeFileViewer,
    goBack
  } = useFolderNavigation();
  const { userFiles, loadUserFiles, downloadFromIPFS } = useIPFSUpload();
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeTab, setActiveTab] = useState<'all' | 'on-chain' | 'shared' | 'inbox'>('all');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cryptoSetupOpen, setCryptoSetupOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [fileForDownload, setFileForDownload] = useState<FileRecordData | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'download' | 'preview';
    file: ParsedFileRecord;
    delegation: ParsedDelegation;
  } | null>(null);
  const [fileToShare, setFileToShare] = useState<any>(null);
  
  // Determine active page for button styling
  const isOnIPFSFiles = location.pathname === '/files' || location.pathname === '/index';

  // Convert IPFS files to BlockDrive format for the grid
  const blockDriveFiles = useMemo(() => {
    return userFiles.map(file => ({
      id: file.id,
      filename: file.filename,
      size: file.size,
      mimeType: file.contentType || 'application/octet-stream',
      cid: file.cid,
      uploadedAt: new Date(file.uploadedAt),
      securityLevel: (file.metadata?.securityLevel as 'standard' | 'enhanced' | 'maximum') || 'standard',
      encrypted: file.metadata?.encrypted === 'true' || file.metadata?.blockdrive === 'true',
      folderPath: file.folderPath,
      onChain: undefined // Will be populated by BlockDriveFileGrid
    }));
  }, [userFiles]);

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  const handleFolderClick = (folderPath: string) => {
    toggleFolder(folderPath);
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
  };

  const handleAccountClick = () => {
    navigate('/account');
  };

  const handleIntegrationsClick = () => {
    navigate('/integrations');
  };

  const handleTeamsClick = () => {
    navigate('/teams');
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');

  const handleUploadComplete = () => {
    // Refresh the file grid when upload completes
    loadUserFiles();
  };

  const handleFileSelect = (file: any) => {
    console.log('File selected:', file);
    // Find original IPFS file or construct a compatible object
    const ipfsFile = userFiles.find(f => f.id === file.id);
    if (ipfsFile) {
      selectFile(ipfsFile);
    } else {
      // For files not in userFiles, create a minimal compatible object
      selectFile({
        id: file.id,
        cid: file.cid,
        filename: file.filename,
        size: file.size,
        contentType: file.mimeType,
        uploadedAt: file.uploadedAt.toISOString(),
        folderPath: file.folderPath || '/',
        ipfsUrl: `https://ipfs.filebase.io/ipfs/${file.cid}`,
        userId: walletData?.address || '',
        metadata: {
          blockdrive: file.encrypted ? 'true' : 'false',
          securityLevel: file.securityLevel,
          commitment: file.onChain?.encryptionCommitment
        }
      });
    }
  };

  const handleDownloadFile = async (file: any) => {
    // Check if file is encrypted (BlockDrive file)
    const ipfsFile = userFiles.find(f => f.id === file.id);
    const isEncrypted = file.encrypted ||
      ipfsFile?.metadata?.blockdrive === 'true' ||
      ipfsFile?.metadata?.encrypted === 'true';

    if (isEncrypted && ipfsFile?.metadata) {
      // Open download modal for encrypted files
      const fileRecord: FileRecordData = {
        contentCID: file.cid,
        metadataCID: ipfsFile.metadata.metadataCID,
        commitment: ipfsFile.metadata.commitment || file.onChain?.encryptionCommitment || '',
        encryptedCriticalBytes: ipfsFile.metadata.encryptedCriticalBytes || '',
        criticalBytesIv: ipfsFile.metadata.criticalBytesIv || '',
        fileIv: ipfsFile.metadata.fileIv || '',
        securityLevel: ipfsFile.metadata.securityLevel || SecurityLevel.STANDARD,
        storageProvider: ipfsFile.metadata.storageProvider || 'filebase',
        // Extended fields for display in modal
        fileName: file.filename,
        fileSize: file.size,
        mimeType: file.mimeType,
      } as FileRecordData & { fileName?: string; fileSize?: number; mimeType?: string };

      setFileForDownload(fileRecord);
      setDownloadModalOpen(true);
    } else {
      // Direct IPFS download for non-encrypted files
      await downloadFromIPFS(file.cid, file.filename);
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
      // Delete logic here
      loadUserFiles();
    }
  };

  const handleShareFile = (file: any) => {
    console.log('Share file:', file);
    // Find original IPFS file to get proofCid and commitment
    const ipfsFile = userFiles.find(f => f.id === file.id);
    const fileToShareData = {
      id: file.id,
      filename: file.filename,
      size: file.size,
      securityLevel: file.securityLevel || 'standard',
      contentCID: file.cid,
      proofCid: ipfsFile?.metadata?.proofCid || file.onChain?.proofCid,
      commitment: ipfsFile?.metadata?.commitment || file.onChain?.encryptionCommitment,
      onChain: file.onChain
    };
    setFileToShare(fileToShareData);
    setShareModalOpen(true);
  };

  const handleShareComplete = () => {
    loadUserFiles();
  };

  // Check if keys are initialized before downloading shared files
  const handleSharedFileDownload = useCallback((file: ParsedFileRecord, delegation: ParsedDelegation) => {
    if (!cryptoState.isInitialized || !isSessionValid) {
      // Keys not ready, prompt setup and store pending action
      setPendingAction({ type: 'download', file, delegation });
      setCryptoSetupOpen(true);
      toast.info('Please set up your encryption keys first');
      return;
    }
    downloadAndSave(file, delegation);
  }, [cryptoState.isInitialized, isSessionValid, downloadAndSave]);

  const handleSharedFilePreview = useCallback(async (file: ParsedFileRecord, delegation: ParsedDelegation) => {
    if (!cryptoState.isInitialized || !isSessionValid) {
      // Keys not ready, prompt setup and store pending action
      setPendingAction({ type: 'preview', file, delegation });
      setCryptoSetupOpen(true);
      toast.info('Please set up your encryption keys first');
      return;
    }
    const result = await previewSharedFile(file, delegation);
    if (result) {
      window.open(result.url, '_blank');
    }
  }, [cryptoState.isInitialized, isSessionValid, previewSharedFile]);

  const handleCryptoSetupComplete = useCallback(async () => {
    setCryptoSetupOpen(false);
    
    // Execute pending action after keys are initialized
    if (pendingAction) {
      toast.success('Keys initialized! Processing your request...');
      
      if (pendingAction.type === 'download') {
        downloadAndSave(pendingAction.file, pendingAction.delegation);
      } else if (pendingAction.type === 'preview') {
        const result = await previewSharedFile(pendingAction.file, pendingAction.delegation);
        if (result) {
          window.open(result.url, '_blank');
        }
      }
      setPendingAction(null);
    }
  }, [pendingAction, downloadAndSave, previewSharedFile]);

  // signTransaction is now provided by useSolanaWalletSigning hook

  // Wrapper component for SharedFilesPanel to fetch on-chain files
  const SharedFilesPanelWrapper = ({ 
    walletAddress, 
    signTransaction: signTx, 
    onRevoke 
  }: { 
    walletAddress: string; 
    signTransaction: (tx: any) => Promise<any>; 
    onRevoke?: () => void;
  }) => {
    const [onChainFiles, setOnChainFiles] = useState<any[]>([]);
    
    useEffect(() => {
      const fetchFiles = async () => {
        if (walletAddress) {
          const files = await getUserFiles(walletAddress);
          setOnChainFiles(files);
        }
      };
      fetchFiles();
    }, [walletAddress]);

    return (
      <SharedFilesPanel
        walletAddress={walletAddress}
        files={onChainFiles}
        signTransaction={signTx}
        onRevoke={onRevoke}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <Header />
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onFolderClick={handleFolderClick}
          openFolders={openFolders}
        />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <Lock className="w-7 h-7 text-primary" />
                  BlockDrive Encrypted Storage
                </h1>
                <p className="text-muted-foreground">Upload, encrypt, and store your files across decentralized providers</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleDashboardClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant={isOnIPFSFiles ? "default" : "outline"}
                  className={isOnIPFSFiles 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  }
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  onClick={handleIntegrationsClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Puzzle className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
                {canAccessTeams && (
                  <Button
                    onClick={handleTeamsClick}
                    variant="outline"
                    className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                    {subscriptionTier === 'growth' && (
                      <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleAccountClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>
            
            <BlockDriveUploadArea 
              selectedFolder={selectedFolder}
              onUploadComplete={handleUploadComplete}
            />
            
            {/* File View Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'on-chain' | 'shared' | 'inbox')}>
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  All Files
                </TabsTrigger>
                <TabsTrigger value="on-chain" className="flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  On-Chain Files
                </TabsTrigger>
                <TabsTrigger value="shared" className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Shared by You
                </TabsTrigger>
                <TabsTrigger value="inbox" className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  Shared With Me
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <BlockDriveFileGrid 
                  files={blockDriveFiles}
                  selectedFolder={selectedFolder}
                  currentPath={currentPath}
                  onGoBack={goBack}
                  onFileSelect={handleFileSelect}
                  onFileDownload={handleDownloadFile}
                  onFileDelete={handleDeleteFile}
                  onFileShare={handleShareFile}
                  onRefresh={loadUserFiles}
                />
              </TabsContent>
              
              <TabsContent value="on-chain">
                <BlockDriveFileGrid 
                  files={blockDriveFiles}
                  selectedFolder="on-chain"
                  currentPath={currentPath}
                  onGoBack={goBack}
                  onFileSelect={handleFileSelect}
                  onFileDownload={handleDownloadFile}
                  onFileDelete={handleDeleteFile}
                  onFileShare={handleShareFile}
                  onRefresh={loadUserFiles}
                />
              </TabsContent>

              <TabsContent value="shared">
                <SharedFilesPanelWrapper 
                  walletAddress={walletData?.address || ''}
                  signTransaction={signTransaction}
                  onRevoke={loadUserFiles}
                />
              </TabsContent>

              <TabsContent value="inbox">
                <SharedWithMePanel 
                  walletAddress={walletData?.address || ''}
                  signTransaction={signTransaction}
                  onDownload={handleSharedFileDownload}
                  onPreview={handleSharedFilePreview}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Encrypted File Viewer Modal */}
      {showFileViewer && selectedFile && (
        <EncryptedFileViewer
          file={selectedFile}
          fileRecord={selectedFile.metadata?.blockdrive === 'true' ? {
            contentCID: selectedFile.cid,
            metadataCID: selectedFile.metadata?.metadataCID,
            commitment: selectedFile.metadata?.commitment || '',
            encryptedCriticalBytes: selectedFile.metadata?.encryptedCriticalBytes || '',
            criticalBytesIv: selectedFile.metadata?.criticalBytesIv || '',
            securityLevel: (selectedFile.metadata?.securityLevel as SecurityLevel) || SecurityLevel.STANDARD,
            storageProvider: 'filebase'
          } : undefined}
          onClose={closeFileViewer}
        />
      )}

      {/* Share File Modal */}
      <ShareFileModal
        isOpen={shareModalOpen}
        onClose={() => {
          setShareModalOpen(false);
          setFileToShare(null);
        }}
        file={fileToShare}
        ownerAddress={walletData?.address || ''}
        signTransaction={signTransaction}
        onShareComplete={handleShareComplete}
      />

      {/* Crypto Setup Modal - triggered before downloading shared files */}
      <CryptoSetupModal
        isOpen={cryptoSetupOpen}
        onClose={() => {
          setCryptoSetupOpen(false);
          setPendingAction(null);
        }}
        onComplete={handleCryptoSetupComplete}
      />

      {/* BlockDrive Download Modal - for encrypted file downloads */}
      <BlockDriveDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => {
          setDownloadModalOpen(false);
          setFileForDownload(null);
        }}
        fileRecord={fileForDownload}
      />
    </div>
  );
};

export default IPFSFiles;
