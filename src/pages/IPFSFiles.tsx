import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from "@/components/layout";
import { BlockDriveFileGrid } from "@/components/files/BlockDriveFileGrid";
import { ShareFileModal } from "@/components/files/ShareFileModal";
import { SharedWithMePanel } from "@/components/files/SharedWithMePanel";
import { BlockDriveUploadArea } from "@/components/upload/BlockDriveUploadArea";
import { BlockDriveDownloadModal } from "@/components/files/BlockDriveDownloadModal";
import { EncryptedFileViewer } from "@/components/viewer/EncryptedFileViewer";
import { CryptoSetupModal } from "@/components/crypto/CryptoSetupModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Files, Users, Share2, Trash2 } from 'lucide-react';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import { useAuth } from '@/hooks/useAuth';
import { useSolanaWalletSigning } from '@/hooks/useSolanaWalletSigning';
import { useSharedFileDownload } from '@/hooks/useSharedFileDownload';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useOrganization } from '@clerk/clerk-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { FileRecordData } from '@/services/blockDriveDownloadService';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { ParsedDelegation, ParsedFileRecord } from '@/services/solana';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';

type TabValue = 'my-files' | 'team-files' | 'shared' | 'trash';
type PendingActionType = 'download' | 'preview';

interface PendingAction {
  type: PendingActionType;
  file: ParsedFileRecord;
  delegation: ParsedDelegation;
}

function isFileEncrypted(file: any, ipfsFile: any): boolean {
  return Boolean(
    file.encrypted ||
    ipfsFile?.metadata?.blockdrive === 'true' ||
    ipfsFile?.metadata?.encrypted === 'true'
  );
}

function toDisplayFile(file: IPFSFile) {
  return {
    id: file.id,
    filename: file.filename,
    size: file.size,
    mimeType: file.contentType || 'application/octet-stream',
    cid: file.cid,
    uploadedAt: new Date(file.uploadedAt),
    securityLevel: (file.metadata?.securityLevel as 'standard' | 'enhanced' | 'maximum') || 'standard',
    encrypted: file.metadata?.encrypted === 'true' || file.metadata?.blockdrive === 'true',
    folderPath: file.folderPath,
  };
}

function IPFSFiles(): JSX.Element {
  const [searchParams] = useSearchParams();
  const isTrashView = searchParams.get('view') === 'trash';
  const searchQuery = searchParams.get('search') || '';

  const { walletData } = useAuth();
  const { signTransaction } = useSolanaWalletSigning();
  const { downloadAndSave, previewSharedFile } = useSharedFileDownload();
  const { state: cryptoState, isSessionValid } = useWalletCrypto();
  const { supabase, userId } = useClerkAuth();
  const { organization } = useOrganization();
  const {
    currentPath,
    selectedFile,
    showFileViewer,
    selectFile,
    closeFileViewer,
    goBack
  } = useFolderNavigation();
  const { userFiles, loadUserFiles, downloadFromIPFS } = useIPFSUpload();

  const getDefaultTab = (): TabValue => {
    if (isTrashView) return 'trash';
    return organization ? 'team-files' : 'my-files';
  };

  const [activeTab, setActiveTab] = useState<TabValue>(getDefaultTab);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [cryptoSetupOpen, setCryptoSetupOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [fileForDownload, setFileForDownload] = useState<FileRecordData | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [fileToShare, setFileToShare] = useState<any>(null);

  const [teamFiles, setTeamFiles] = useState<IPFSFile[]>([]);
  const [myOrgFiles, setMyOrgFiles] = useState<IPFSFile[]>([]);
  const [loadingOrgFiles, setLoadingOrgFiles] = useState(false);

  const isInOrganization = !!organization;

  useEffect(() => {
    if (isTrashView) {
      setActiveTab('trash');
    } else if (activeTab === 'trash') {
      setActiveTab(getDefaultTab());
    }
  }, [isTrashView]);

  useEffect(() => {
    if (isInOrganization && activeTab === 'my-files') {
      setActiveTab('team-files');
    } else if (!isInOrganization && activeTab === 'team-files') {
      setActiveTab('my-files');
    }
  }, [isInOrganization]);

  const loadOrgFiles = useCallback(async () => {
    if (!organization || !userId || !supabase) return;

    setLoadingOrgFiles(true);
    try {
      const [teamFilesData, myFilesData] = await Promise.all([
        FileDatabaseService.loadTeamFiles(supabase, organization.id),
        FileDatabaseService.loadMyOrgFiles(supabase, organization.id, userId)
      ]);
      setTeamFiles(teamFilesData);
      setMyOrgFiles(myFilesData);
    } catch (error) {
      console.error('Failed to load organization files:', error);
      toast.error('Failed to load team files');
    } finally {
      setLoadingOrgFiles(false);
    }
  }, [organization, userId, supabase]);

  useEffect(() => {
    if (isInOrganization) {
      loadOrgFiles();
    } else {
      setTeamFiles([]);
      setMyOrgFiles([]);
    }
  }, [organization?.id, isInOrganization, loadOrgFiles]);

  const blockDriveFiles = useMemo(() => userFiles.map(toDisplayFile), [userFiles]);
  const teamFilesForDisplay = useMemo(() => teamFiles.map(toDisplayFile), [teamFiles]);
  const myOrgFilesForDisplay = useMemo(() => myOrgFiles.map(toDisplayFile), [myOrgFiles]);

  const filterBySearch = useCallback((files: any[]) => {
    if (!searchQuery) return files;
    const query = searchQuery.toLowerCase();
    return files.filter(f => f.filename.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleUploadComplete = useCallback(() => {
    loadUserFiles();
    if (isInOrganization) {
      loadOrgFiles();
    }
  }, [loadUserFiles, isInOrganization, loadOrgFiles]);

  const handleFileSelect = (file: any) => {
    const ipfsFile = userFiles.find(f => f.id === file.id);
    if (ipfsFile) {
      selectFile(ipfsFile);
    } else {
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
    const ipfsFile = userFiles.find(f => f.id === file.id);
    const encrypted = isFileEncrypted(file, ipfsFile);

    if (encrypted && ipfsFile?.metadata) {
      const fileRecord: FileRecordData = {
        contentCID: file.cid,
        metadataCID: ipfsFile.metadata.metadataCID,
        commitment: ipfsFile.metadata.commitment || file.onChain?.encryptionCommitment || '',
        encryptedCriticalBytes: ipfsFile.metadata.encryptedCriticalBytes || '',
        criticalBytesIv: ipfsFile.metadata.criticalBytesIv || '',
        fileIv: ipfsFile.metadata.fileIv || '',
        securityLevel: ipfsFile.metadata.securityLevel || SecurityLevel.STANDARD,
        storageProvider: ipfsFile.metadata.storageProvider || 'filebase',
        fileName: file.filename,
        fileSize: file.size,
        mimeType: file.mimeType,
      } as FileRecordData & { fileName?: string; fileSize?: number; mimeType?: string };

      setFileForDownload(fileRecord);
      setDownloadModalOpen(true);
    } else {
      await downloadFromIPFS(file.cid, file.filename);
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
      loadUserFiles();
    }
  };

  const handleShareFile = (file: any) => {
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

  const handleSharedFileDownload = useCallback((file: ParsedFileRecord, delegation: ParsedDelegation) => {
    if (!cryptoState.isInitialized || !isSessionValid) {
      setPendingAction({ type: 'download', file, delegation });
      setCryptoSetupOpen(true);
      toast.info('Please set up your encryption keys first');
      return;
    }
    downloadAndSave(file, delegation);
  }, [cryptoState.isInitialized, isSessionValid, downloadAndSave]);

  const handleSharedFilePreview = useCallback(async (file: ParsedFileRecord, delegation: ParsedDelegation) => {
    if (!cryptoState.isInitialized || !isSessionValid) {
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

  const FileGridContent = ({
    files,
    isTeam = false,
    isPrivate = false,
    onRefresh
  }: {
    files: any[];
    isTeam?: boolean;
    isPrivate?: boolean;
    onRefresh: () => void;
  }) => (
    <BlockDriveFileGrid
      files={filterBySearch(files)}
      selectedFolder={selectedFolder}
      currentPath={currentPath}
      onGoBack={goBack}
      onFileSelect={handleFileSelect}
      onFileDownload={handleDownloadFile}
      onFileDelete={handleDeleteFile}
      onFileShare={handleShareFile}
      onRefresh={onRefresh}
      loading={isTeam ? loadingOrgFiles : false}
      showTeamActions={isInOrganization && (isTeam || isPrivate)}
      isPrivateFile={isPrivate}
      onActionComplete={onRefresh}
    />
  );

  return (
    <AppShell
      title="Files"
      description="Manage your encrypted files and documents"
    >
      <div className="space-y-6">
        {activeTab !== 'shared' && activeTab !== 'trash' && (
          <BlockDriveUploadArea
            selectedFolder={selectedFolder}
            onUploadComplete={handleUploadComplete}
          />
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="bg-muted/50 rounded-lg p-1">
            {isInOrganization ? (
              <>
                <TabsTrigger value="team-files" className="gap-2">
                  <Users className="w-4 h-4" />
                  Team Files
                </TabsTrigger>
                <TabsTrigger value="my-files" className="gap-2">
                  <Files className="w-4 h-4" />
                  My Files
                </TabsTrigger>
              </>
            ) : (
              <TabsTrigger value="my-files" className="gap-2">
                <Files className="w-4 h-4" />
                My Files
              </TabsTrigger>
            )}
            <TabsTrigger value="shared" className="gap-2">
              <Share2 className="w-4 h-4" />
              Shared With Me
            </TabsTrigger>
            {isTrashView && (
              <TabsTrigger value="trash" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Trash
              </TabsTrigger>
            )}
          </TabsList>

          {isInOrganization && (
            <TabsContent value="team-files" className="mt-6">
              <FileGridContent
                files={teamFilesForDisplay}
                isTeam={true}
                onRefresh={loadOrgFiles}
              />
            </TabsContent>
          )}

          <TabsContent value="my-files" className="mt-6">
            <FileGridContent
              files={isInOrganization ? myOrgFilesForDisplay : blockDriveFiles}
              isPrivate={isInOrganization}
              onRefresh={isInOrganization ? loadOrgFiles : loadUserFiles}
            />
          </TabsContent>

          <TabsContent value="shared" className="mt-6">
            <SharedWithMePanel
              walletAddress={walletData?.address || ''}
              signTransaction={signTransaction}
              onDownload={handleSharedFileDownload}
              onPreview={handleSharedFilePreview}
            />
          </TabsContent>

          <TabsContent value="trash" className="mt-6">
            <div className="bg-card rounded-lg border border-border p-16 text-center">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-foreground-muted opacity-50" />
              <p className="text-foreground-muted font-medium">Trash is empty</p>
              <p className="text-sm text-foreground-muted mt-2">
                Deleted files will appear here for 30 days before permanent removal.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

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

      <CryptoSetupModal
        isOpen={cryptoSetupOpen}
        onClose={() => {
          setCryptoSetupOpen(false);
          setPendingAction(null);
        }}
        onComplete={handleCryptoSetupComplete}
      />

      <BlockDriveDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => {
          setDownloadModalOpen(false);
          setFileForDownload(null);
        }}
        fileRecord={fileForDownload}
      />
    </AppShell>
  );
}

export default IPFSFiles;
