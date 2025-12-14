
import React, { useState } from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { IPFSFileGrid } from "@/components/IPFSFileGrid";
import { BlockDriveUploadArea } from "@/components/upload/BlockDriveUploadArea";
import { FileViewer } from "@/components/FileViewer";
import { Button } from '@/components/ui/button';
import { BarChart3, Settings, Files, Puzzle, Bot, Users, Crown, Lock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useIPFSUpload } from "@/hooks/useIPFSUpload";
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const IPFSFiles = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscriptionStatus();
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

  const handleTeamsClick = () => {
    navigate('/teams');
  };

  const handleAgentsClick = () => {
    navigate('/agents');
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');

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
                  onClick={handleAgentsClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Agents
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
            
            <BlockDriveUploadArea 
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
