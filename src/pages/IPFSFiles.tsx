
import React, { useState } from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { IPFSFileGrid } from "@/components/IPFSFileGrid";
import { IPFSUploadArea } from "@/components/IPFSUploadArea";
import { FileViewer } from "@/components/FileViewer";
import { Button } from '@/components/ui/button';
import { BarChart3, Settings, Files, Puzzle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";

const IPFSFiles = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // Determine active page for button styling
  const isOnIPFSFiles = location.pathname === '/files' || location.pathname === '/index';

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
    </div>
  );
};

export default IPFSFiles;
