import React from 'react';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import { Slack, Cloud, HardDrive, Box, Anchor } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

const Integrations = () => {
  const { currentPath, openFolders, toggleFolder } = useFolderNavigation();
  const { isConnected: isBoxConnected } = useBoxOAuth();
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

  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      icon: Slack,
      color: 'text-blue-400',
      description: 'Connect your Slack workspace to share files and collaborate with your team.',
      onClick: () => setShowSlackIntegration(true)
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: Cloud,
      color: 'text-blue-600',
      description: 'Sync your OneDrive files with BlockDrive for seamless cloud storage.',
      onClick: () => setShowOneDriveIntegration(true)
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: HardDrive,
      color: 'text-green-500',
      description: 'Import and export files between Google Drive and BlockDrive.',
      onClick: () => setShowGoogleDriveIntegration(true)
    },
    {
      id: 'box',
      name: 'Dropbox',
      icon: Box,
      color: 'text-blue-500',
      description: 'Connect Dropbox to access your files on the blockchain.',
      onClick: () => setShowBoxIntegration(true)
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      icon: Anchor,
      color: 'text-cyan-500',
      description: 'View and manage your NFTs stored on BlockDrive.',
      onClick: () => {}
    }
  ];

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
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Integrations</h1>
              <p className="text-muted-foreground">Connect BlockDrive with your favorite tools and services</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 hover:border-primary/30 hover:bg-card/70 transition-all"
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <integration.icon className={`w-6 h-6 ${integration.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {integration.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {integration.description}
                  </p>
                  <Button
                    onClick={integration.onClick}
                    variant="outline"
                    className="w-full bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  >
                    Connect
                  </Button>
                </div>
              ))}
            </div>
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

export default Integrations;
