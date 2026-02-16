import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AppShell } from "@/components/layout";
import { BlockDriveFileGrid, DRAG_TYPE } from "@/components/files/BlockDriveFileGrid";
import { ShareFileModal } from "@/components/files/ShareFileModal";
import { SharedWithMePanel } from "@/components/files/SharedWithMePanel";
import { BlockDriveDownloadModal } from "@/components/files/BlockDriveDownloadModal";
import { EncryptedFileViewer } from "@/components/viewer/EncryptedFileViewer";
import { CryptoSetupModal } from "@/components/crypto/CryptoSetupModal";
import { CreateFolderModal } from "@/components/CreateFolderModal";
import { MoveToFolderModal } from "@/components/files/MoveToFolderModal";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Files,
  Users,
  User,
  Share2,
  Trash2,
  Upload,
  FolderPlus,
  Key,
  Link2,
  CheckCircle
} from 'lucide-react';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import { useBlockDriveUpload } from "@/hooks/useBlockDriveUpload";
import { useAuth } from '@/hooks/useAuth';
import { useUploadPermissions } from '@/hooks/useUploadPermissions';
import { useSolanaWalletSigning } from '@/hooks/useSolanaWalletSigning';
import { useSharedFileDownload } from '@/hooks/useSharedFileDownload';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { useOrganization } from '@clerk/clerk-react';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import { DEFAULT_STORAGE_CONFIG } from '@/types/storageProvider';
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
  const navigate = useNavigate();
  const isTrashView = searchParams.get('view') === 'trash';
  const searchQuery = searchParams.get('search') || '';

  const { walletData } = useAuth();
  const { signTransaction } = useSolanaWalletSigning();
  const { downloadAndSave, previewSharedFile } = useSharedFileDownload();
  const { state: cryptoState, isSessionValid } = useWalletCrypto();
  const { supabase, userId } = useClerkAuth();
  const { organization } = useOrganization();
  const { canUpload } = useUploadPermissions();
  const {
    currentPath,
    selectedFile,
    showFileViewer,
    navigateToFolder,
    selectFile,
    closeFileViewer,
    goBack
  } = useFolderNavigation();
  const { userFiles, loadUserFiles, downloadFromIPFS } = useIPFSUpload();

  const {
    isUploading,
    progress,
    hasKeys,
    uploadFiles,
  } = useBlockDriveUpload({ enableOnChainRegistration: false });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [pendingFileView, setPendingFileView] = useState<any>(null);
  const [pendingDownloadFile, setPendingDownloadFile] = useState<any>(null);
  const [fileToShare, setFileToShare] = useState<any>(null);

  const [teamFiles, setTeamFiles] = useState<IPFSFile[]>([]);
  const [myOrgFiles, setMyOrgFiles] = useState<IPFSFile[]>([]);
  const [loadingOrgFiles, setLoadingOrgFiles] = useState(false);

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [fileToMove, setFileToMove] = useState<any>(null);
  const [movingFile, setMovingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [showDestinationModal, setShowDestinationModal] = useState(false);

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

  const findFullFile = useCallback((fileId: string): IPFSFile | undefined => {
    return userFiles.find(f => f.id === fileId)
      || myOrgFiles.find(f => f.id === fileId)
      || teamFiles.find(f => f.id === fileId);
  }, [userFiles, myOrgFiles, teamFiles]);

  const handleUploadClick = () => {
    if (!canUpload) {
      navigate('/pricing');
      return;
    }

    if (!hasKeys) {
      setCryptoSetupOpen(true);
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (!hasKeys) {
      setPendingFiles(files);
      setCryptoSetupOpen(true);
      return;
    }

    if (isInOrganization) {
      setPendingFiles(files);
      setShowDestinationModal(true);
      return;
    }

    await processUpload(files);
  };

  const processUpload = async (files: FileList | File[], targetPath?: string) => {
    setShowDestinationModal(false);

    const folderPath = targetPath || currentPath || '/';

    const results = await uploadFiles(
      files,
      SecurityLevel.MAXIMUM,
      DEFAULT_STORAGE_CONFIG,
      folderPath,
      signTransaction || undefined
    );

    if (results.length > 0) {
      handleUploadComplete();
    }

    setPendingFiles(null);
  };

  const handleDestinationSelect = () => {
    if (pendingFiles) {
      processUpload(pendingFiles);
    }
  };

  const isInternalDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(DRAG_TYPE);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isInternalDrag(e)) return;
    if (activeTab === 'shared' || activeTab === 'trash') return;
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isInternalDrag(e)) return;
    if (activeTab === 'shared' || activeTab === 'trash') return;
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };


  const handleCreateFolder = async (name: string) => {
    if (!userId || !supabase) return;
    setCreatingFolder(true);
    try {
      await FileDatabaseService.createFolder(
        supabase, userId, name, currentPath,
        organization?.id, organization ? 'private' : undefined
      );
      toast.success(`Folder "${name}" created`);
      handleUploadComplete();
    } catch (err) {
      toast.error('Failed to create folder');
      console.error('Folder creation error:', err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const availableFolders = useMemo(() => {
    const allFiles = isInOrganization
      ? [...teamFilesForDisplay, ...myOrgFilesForDisplay]
      : blockDriveFiles;
    return allFiles
      .filter(f => f.mimeType === 'application/x-directory')
      .map(f => ({
        name: f.filename,
        path: f.folderPath === '/' ? `/${f.filename}` : `${f.folderPath}/${f.filename}`,
      }));
  }, [blockDriveFiles, teamFilesForDisplay, myOrgFilesForDisplay, isInOrganization]);

  const handleFileMove = setFileToMove;

  const handleMoveFileToFolder = async (fileId: string, targetFolderPath: string) => {
    if (!userId || !supabase) return;
    const allDisplay = isInOrganization
      ? [...teamFilesForDisplay, ...myOrgFilesForDisplay]
      : blockDriveFiles;
    const file = allDisplay.find(f => f.id === fileId);
    if (!file) return;

    try {
      await FileDatabaseService.moveFileToFolder(supabase, fileId, userId, targetFolderPath, file.filename);
      toast.success(`Moved "${file.filename}" to ${targetFolderPath === '/' ? 'root' : targetFolderPath}`);
      handleUploadComplete();
    } catch (err) {
      toast.error('Failed to move file');
      console.error('Move file error:', err);
    }
  };

  const handleMoveFromModal = async (targetPath: string) => {
    if (!fileToMove) return;
    setMovingFile(true);
    try {
      await handleMoveFileToFolder(fileToMove.id, targetPath);
      setFileToMove(null);
    } finally {
      setMovingFile(false);
    }
  };

  const handleDropFilesToFolder = async (files: FileList, targetFolderPath: string) => {
    if (!hasKeys) {
      setPendingFiles(files);
      setCryptoSetupOpen(true);
      return;
    }
    await processUpload(files, targetFolderPath);
  };

  const openFileViewer = (file: any) => {
    const ipfsFile = findFullFile(file.id);
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

  const handleFileSelectAction = (file: any) => {
    if (file.mimeType === 'application/x-directory') return;

    const ipfsFile = findFullFile(file.id);
    const encrypted = isFileEncrypted(file, ipfsFile);

    if (encrypted && !cryptoState.isInitialized) {
      setPendingFileView(file);
      setCryptoSetupOpen(true);
      return;
    }

    openFileViewer(file);
  };

  const openDownloadModal = (file: any) => {
    const ipfsFile = findFullFile(file.id);

    if (ipfsFile?.metadata) {
      const fileRecord: FileRecordData = {
        contentCID: file.cid,
        metadataCID: ipfsFile.metadata.metadataCID,
        commitment: ipfsFile.metadata.commitment || file.onChain?.encryptionCommitment || '',
        proofCid: ipfsFile.metadata.proofCid || file.onChain?.proofCid,
        encryptedCriticalBytes: ipfsFile.metadata.encryptedCriticalBytes || '',
        criticalBytesIv: ipfsFile.metadata.criticalBytesIv || '',
        fileIv: ipfsFile.metadata.fileIv || '',
        securityLevel: ipfsFile.metadata.securityLevel || SecurityLevel.STANDARD,
        storageProvider: ipfsFile.metadata.storageProvider || 'filebase',
        fileName: file.filename,
        fileSize: file.size,
        mimeType: file.mimeType,
      };

      setFileForDownload(fileRecord);
      setDownloadModalOpen(true);
    } else {
      downloadFromIPFS(file.cid, file.filename);
    }
  };

  const handleDownloadFile = async (file: any) => {
    const ipfsFile = findFullFile(file.id);
    const encrypted = isFileEncrypted(file, ipfsFile);

    if (encrypted && !cryptoState.isInitialized) {
      setPendingDownloadFile(file);
      setCryptoSetupOpen(true);
      return;
    }

    openDownloadModal(file);
  };

  const handleDeleteFile = async (file: any) => {
    if (!userId || !supabase) return;

    if (file.mimeType === 'application/x-directory') {
      if (confirm(`Are you sure you want to delete the folder "${file.filename}"?`)) {
        try {
          await FileDatabaseService.deleteFolder(supabase, file.id, userId);
          toast.success(`Folder "${file.filename}" deleted`);
          handleUploadComplete();
        } catch (err) {
          toast.error('Failed to delete folder');
          console.error('Folder deletion error:', err);
        }
      }
      return;
    }

    if (confirm(`Are you sure you want to delete ${file.filename}?`)) {
      try {
        await FileDatabaseService.deleteFile(file.id, userId);
        toast.success(`"${file.filename}" deleted`);
        handleUploadComplete();
      } catch (err) {
        toast.error('Failed to delete file');
        console.error('File deletion error:', err);
      }
    }
  };

  const handleShareFile = (file: any) => {
    const ipfsFile = findFullFile(file.id);
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
    toast.success('Keys initialized!');

    if (pendingAction) {
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

    if (pendingFileView) {
      openFileViewer(pendingFileView);
      setPendingFileView(null);
    }

    if (pendingDownloadFile) {
      openDownloadModal(pendingDownloadFile);
      setPendingDownloadFile(null);
    }

    if (pendingFiles) {
      if (isInOrganization) {
        setShowDestinationModal(true);
      } else {
        await processUpload(pendingFiles);
      }
    }
  }, [pendingAction, pendingFileView, pendingDownloadFile, pendingFiles, downloadAndSave, previewSharedFile]);

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
      onFileSelect={handleFileSelectAction}
      onFileDownload={handleDownloadFile}
      onFileDelete={handleDeleteFile}
      onFileShare={handleShareFile}
      onFileMove={handleFileMove}
      onFolderNavigate={navigateToFolder}
      onMoveFileToFolder={handleMoveFileToFolder}
      onDropFilesToFolder={handleDropFilesToFolder}
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
      description={currentPath !== '/' ? currentPath : "Manage your encrypted files"}
      actions={
        <div className="flex items-center gap-2">
          {hasKeys ? (
            <Button
              onClick={handleUploadClick}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          ) : (
            <Button
              onClick={() => setCryptoSetupOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Key className="w-4 h-4 mr-2" />
              Set Up Keys
            </Button>
          )}
          <Button
            onClick={() => setShowCreateFolderModal(true)}
            size="sm"
            variant="outline"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
      }
    >
      <div
        className="relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="absolute inset-0 z-40 bg-blue-500/10 border-2 border-dashed border-blue-500/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-medium">Drop files to upload</p>
            </div>
          </div>
        )}

        {isInOrganization && (
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">
              <Users className="w-3 h-3 mr-1" />
              {organization.name}
            </Badge>
          </div>
        )}

        {isUploading && progress && (
          <div className="mb-4 bg-zinc-900 rounded-lg border border-zinc-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-300">{progress.message}</span>
              <span className="text-xs text-zinc-500 font-mono">{Math.round(progress.progress)}%</span>
            </div>
            <Progress value={progress.progress} className="h-1.5" />
          </div>
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
            <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-16 text-center">
              <Trash2 className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
              <p className="text-zinc-400 font-medium">Trash is empty</p>
              <p className="text-sm text-zinc-500 mt-2">
                Deleted files will appear here for 30 days before permanent removal.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept="*/*"
        />
      </div>

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
              onClick={handleDestinationSelect}
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
              onClick={handleDestinationSelect}
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

      {showFileViewer && selectedFile && (
        <EncryptedFileViewer
          file={selectedFile}
          fileRecord={selectedFile.metadata?.blockdrive === 'true' ? {
            contentCID: selectedFile.cid,
            metadataCID: selectedFile.metadata?.metadataCID,
            commitment: selectedFile.metadata?.commitment || '',
            proofCid: selectedFile.metadata?.proofCid,
            encryptedCriticalBytes: selectedFile.metadata?.encryptedCriticalBytes || '',
            criticalBytesIv: selectedFile.metadata?.criticalBytesIv || '',
            fileIv: selectedFile.metadata?.fileIv || '',
            securityLevel: (selectedFile.metadata?.securityLevel as SecurityLevel) || SecurityLevel.STANDARD,
            storageProvider: 'filebase',
            fileName: selectedFile.filename,
            mimeType: selectedFile.contentType,
            fileSize: selectedFile.size,
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
        onShareComplete={loadUserFiles}
      />

      <CryptoSetupModal
        isOpen={cryptoSetupOpen}
        onClose={() => {
          setCryptoSetupOpen(false);
          setPendingAction(null);
          setPendingFileView(null);
          setPendingDownloadFile(null);
          setPendingFiles(null);
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

      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={(name) => {
          handleCreateFolder(name);
          setShowCreateFolderModal(false);
        }}
        loading={creatingFolder}
      />

      <MoveToFolderModal
        isOpen={!!fileToMove}
        onClose={() => { setFileToMove(null); setMovingFile(false); }}
        filename={fileToMove?.filename || ''}
        currentFolderPath={fileToMove?.folderPath}
        folders={availableFolders}
        onMove={handleMoveFromModal}
        loading={movingFile}
      />
    </AppShell>
  );
}

export default IPFSFiles;
