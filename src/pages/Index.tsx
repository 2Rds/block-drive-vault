
import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { IPFSFileGrid } from '@/components/IPFSFileGrid';
import { IPFSUploadArea } from '@/components/IPFSUploadArea';
import { StatsCards } from '@/components/StatsCards';
import { WalletInfo } from '@/components/WalletInfo';
import { DataDashboard } from '@/components/DataDashboard';
import { FileViewer } from '@/components/FileViewer';
import { Button } from '@/components/ui/button';
import { BarChart3, Files, Slack } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useIPFSUpload } from '@/hooks/useIPFSUpload';

const Index = () => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeView, setActiveView] = useState<'dashboard' | 'files'>('files');
  const [userFolders, setUserFolders] = useState<string[]>([]);
  const [showSlackIntegration, setShowSlackIntegration] = useState(false);
  
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
        />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {activeView === 'dashboard' ? 'Analytics Dashboard' : 'IPFS File Storage'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {activeView === 'dashboard' 
                    ? 'Comprehensive insights into your BlockDrive usage'
                    : 'Decentralized file storage on the InterPlanetary File System'
                  }
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => setActiveView('dashboard')}
                  variant={activeView === 'dashboard' ? 'default' : 'outline'}
                  className={`${
                    activeView === 'dashboard'
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  onClick={() => setActiveView('files')}
                  variant={activeView === 'files' ? 'default' : 'outline'}
                  className={`${
                    activeView === 'files'
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50'
                  }`}
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  onClick={() => setShowSlackIntegration(true)}
                  variant="outline"
                  className="bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:border-accent/50"
                >
                  <Slack className="w-4 h-4 mr-2" />
                  Slack
                </Button>
              </div>
            </div>

            <WalletInfo />

            {activeView === 'dashboard' ? (
              <DataDashboard />
            ) : (
              <>
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
              </>
            )}
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

      <SlackIntegration
        isOpen={showSlackIntegration}
        onClose={() => setShowSlackIntegration(false)}
      />
    </div>
  );
};

export default Index;
