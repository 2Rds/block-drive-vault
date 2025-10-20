import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { DataDashboard } from "@/components/DataDashboard";
import { Button } from '@/components/ui/button';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { BarChart3, Files, Settings, Users, Crown } from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscriptionStatus();
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

  const handleFilesClick = () => {
    console.log('Navigating to IPFS files');
    navigate('/files');
  };

  const handleAccountClick = () => {
    console.log('Navigating to account');
    navigate('/account');
  };

  const handleTeamsClick = () => {
    console.log('Navigating to teams');
    navigate('/teams');
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');
  
  // Determine active page for button styling
  const isOnDashboard = location.pathname === '/dashboard';

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
                <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
                <p className="text-muted-foreground">View your data usage, file activity, and blockchain analytics</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant={isOnDashboard ? "default" : "outline"}
                  className={isOnDashboard 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  }
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
            
            <DataDashboard />
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

export default Dashboard;