
import React, { useState } from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { IPFSFileGrid } from "@/components/IPFSFileGrid";
import { IPFSUploadArea } from "@/components/IPFSUploadArea";
import { FileViewer } from "@/components/FileViewer";
import { Button } from '@/components/ui/button';
import { BarChart3, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';

const IPFSFiles = () => {
  const navigate = useNavigate();
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
  const { downloadFromIPFS } = useIPFSUpload();
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [showSlackIntegration, setShowSlackIntegration] = useState(false);
  const [showOneDriveIntegration, setShowOneDriveIntegration] = useState(false);
  const [showGoogleDriveIntegration, setShowGoogleDriveIntegration] = useState(false);
  const [showBoxIntegration, setShowBoxIntegration] = useState(false);

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

  const handleUploadComplete = () => {
    // Refresh the file grid when upload completes
    window.location.reload();
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
          onFolderSelect={handleFolderSelect}
          onFolderClick={handleFolderClick}
          openFolders={openFolders}
          onSlackClick={() => setShowSlackIntegration(true)}
          onOneDriveClick={() => setShowOneDriveIntegration(true)}
          onGoogleDriveClick={() => setShowGoogleDriveIntegration(true)}
          onBoxClick={() => setShowBoxIntegration(true)}
        />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">BlockDrive IPFS Storage</h1>
                <p className="text-muted-foreground">Upload, manage, and access your files on the decentralized web</p>
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
              </div>
            </div>
            
            <IPFSUploadArea 
              selectedFolder={selectedFolder}
              onUploadComplete={handleUploadComplete}
            />
            
            <IPFSFileGrid 
              selectedFolder={selectedFolder}
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

export default IPFSFiles;
