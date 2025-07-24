
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { Button } from '@/components/ui/button';
import { BarChart3, Files, Settings } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

const Account = () => {
  const navigate = useNavigate();
  const { currentPath, openFolders, toggleFolder } = useFolderNavigation();
  const { isConnected: isBoxConnected } = useBoxOAuth(); // Handle Box OAuth callbacks
  const [selectedFolder, setSelectedFolder] = React.useState('all');
  const [showSlackIntegration, setShowSlackIntegration] = React.useState(false);
  const [showOneDriveIntegration, setShowOneDriveIntegration] = React.useState(false);
  const [showGoogleDriveIntegration, setShowGoogleDriveIntegration] = React.useState(false);
  const [showBoxIntegration, setShowBoxIntegration] = React.useState(false);

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  const handleFolderClick = (folderPath: string) => {
    toggleFolder(folderPath);
  };

  const handleDashboardClick = () => {
    console.log('Navigating to dashboard');
    navigate('/dashboard');
  };

  const handleFilesClick = () => {
    console.log('Navigating to files');
    navigate('/files');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Account Management</h1>
                <p className="text-gray-400">Manage your BlockDrive account and subscription</p>
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
                  onClick={handleFilesClick}
                  variant="outline"
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  variant="default"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>
            
            <SubscriptionManager />
          </div>
        </main>
      </div>

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

export default Account;
