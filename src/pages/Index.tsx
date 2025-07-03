
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { IPFSFileGrid } from '@/components/IPFSFileGrid';
import { IPFSUploadArea } from '@/components/IPFSUploadArea';
import { StatsCards } from '@/components/StatsCards';
import { WalletInfo } from '@/components/WalletInfo';
import { DataDashboard } from '@/components/DataDashboard';
import { FileViewer } from '@/components/FileViewer';
import { Button } from '@/components/ui/button';
import { BarChart3, Files, Settings } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';

const Index = () => {
  const navigate = useNavigate();
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [userFolders, setUserFolders] = useState<string[]>([]);
  const [showSlackIntegration, setShowSlackIntegration] = useState(false);
  const [showOneDriveIntegration, setShowOneDriveIntegration] = useState(false);
  const [showGoogleDriveIntegration, setShowGoogleDriveIntegration] = useState(false);
  const [showBoxIntegration, setShowBoxIntegration] = useState(false);
  
  const {
    currentPath,
    openFolders,
    selectedFile,
    showFileViewer,
    navigateToFolder,
    toggleFolder,
    selectFile,
    closeFileViewer,
    goBack
  } = useFolderNavigation();

  const { downloadFromIPFS } = useIPFSUpload();

  const handleCreateFolder = (folderName: string) => {
    setUserFolders(prev => [...prev, folderName]);
    console.log('User folders updated:', [...userFolders, folderName]);
  };

  const handleFolderClick = (folderPath: string) => {
    console.log('Folder clicked:', folderPath);
    toggleFolder(folderPath);
    navigateToFolder(folderPath);
  };

  const handleFileSelect = (file: any) => {
    console.log('File selected:', file);
    selectFile(file);
  };

  const handleDownloadFile = async (file: any) => {
    await downloadFromIPFS(file.cid, file.filename);
  };

  const handleDashboardClick = () => {
    console.log('Navigating to dashboard');
    navigate('/dashboard');
  };

  const handleAccountClick = () => {
    console.log('Navigating to account');
    navigate('/account');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <Header />
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder} 
          onFolderSelect={setSelectedFolder}
          userFolders={userFolders}
          onFolderClick={handleFolderClick}
          openFolders={openFolders}
          onSlackClick={() => setShowSlackIntegration(true)}
          onOneDriveClick={() => setShowOneDriveIntegration(true)}
          onGoogleDriveClick={() => setShowGoogleDriveIntegration(true)}
          onBoxClick={() => setShowBoxIntegration(true)}
        />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  IPFS File Storage
                </h1>
                <p className="text-muted-foreground mt-1">
                  Decentralized file storage on the InterPlanetary File System
                </p>
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
                  onClick={handleAccountClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
              </div>
            </div>

            <WalletInfo />
            <StatsCards />
            <IPFSUploadArea 
              onCreateFolder={handleCreateFolder}
              selectedFolder={selectedFolder}
            />
            <IPFSFileGrid 
              selectedFolder={selectedFolder} 
              userFolders={userFolders}
              currentPath={currentPath}
              onGoBack={goBack}
              onFileSelect={handleFileSelect}
            />
          </div>
        </main>
      </div>

      {/* File Viewer Modal */}
      {showFileViewer && selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={closeFileViewer}
          onDownload={handleDownloadFile}
        />
      )}

      {/* Integration Modals */}
      <SlackIntegration
        isOpen={showSlackIntegration}
        onClose={() => setShowSlackIntegration(false)}
      />

      <OneDriveIntegration
        isOpen={showOneDriveIntegration}
        onClose={() => setShowOneDriveIntegration(false)}
      />

      <GoogleDriveIntegration
        isOpen={showGoogleDriveIntegration}
        onClose={() => setShowGoogleDriveIntegration(false)}
      />

      <BoxIntegration
        isOpen={showBoxIntegration}
        onClose={() => setShowBoxIntegration(false)}
      />
    </div>
  );
};

export default Index;
