import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { Button } from '@/components/ui/button';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { BarChart3, Files, Settings, Users, Crown, Puzzle } from 'lucide-react';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

const Account = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { currentPath, openFolders, toggleFolder } = useFolderNavigation();
  const { isConnected: isBoxConnected } = useBoxOAuth(); // Handle Box OAuth callbacks
  const [selectedFolder, setSelectedFolder] = React.useState('all');

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

  const handleTeamsClick = () => {
    console.log('Navigating to teams');
    navigate('/teams');
  };

  const handleIntegrationsClick = () => {
    console.log('Navigating to integrations');
    navigate('/integrations');
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');
  
  // Determine active page for button styling
  const isOnAccount = location.pathname === '/account';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <div className="flex">
        <Sidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onFolderClick={handleFolderClick}
          openFolders={openFolders}
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
                  variant={isOnAccount ? "default" : "outline"}
                  className={isOnAccount 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  }
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>
            
            <SubscriptionManager />

            {/* Advanced Settings - Hidden wallet address for troubleshooting */}
            <AdvancedSettings />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Account;