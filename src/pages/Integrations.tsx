import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import { 
  Slack, Cloud, HardDrive, Box, Anchor, MessageSquare, Database, 
  CloudCog, Server, Building2, FileText, CheckSquare, Briefcase,
  DollarSign, Calculator, Users, Phone, TrendingUp, Heart, BarChart3, 
  Files, Puzzle, Settings, Bot
} from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const Integrations = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPath, openFolders, toggleFolder } = useFolderNavigation();
  const { isConnected: isBoxConnected } = useBoxOAuth();
  const { subscriptionStatus } = useSubscriptionStatus();
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
    navigate('/dashboard');
  };

  const handleFilesClick = () => {
    navigate('/files');
  };

  const handleTeamsClick = () => {
    navigate('/teams');
  };

  const handleAccountClick = () => {
    navigate('/account');
  };

  const handleAgentsClick = () => {
    navigate('/agents');
  };

  // Check if user has growth or scale subscription
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = isSubscribed && (subscriptionTier === 'growth' || subscriptionTier === 'scale');

  const isOnIntegrations = location.pathname === '/integrations';

  const integrations = [
    {
      id: 'slack',
      name: 'Slack',
      icon: Slack,
      color: 'text-purple-400',
      description: 'Connect your Slack workspace to share files and collaborate with your team.',
      onClick: () => setShowSlackIntegration(true)
    },
    {
      id: 'onedrive',
      name: 'OneDrive',
      icon: Cloud,
      color: 'text-blue-500',
      description: 'Sync your OneDrive files with BlockDrive for seamless cloud storage.',
      onClick: () => setShowOneDriveIntegration(true)
    },
    {
      id: 'googledrive',
      name: 'Google Drive',
      icon: HardDrive,
      color: 'text-yellow-500',
      description: 'Import and export files between Google Drive and BlockDrive.',
      onClick: () => setShowGoogleDriveIntegration(true)
    },
    {
      id: 'dropbox',
      name: 'Dropbox',
      icon: Box,
      color: 'text-blue-400',
      description: 'Connect Dropbox to access your files on the blockchain.',
      onClick: () => setShowBoxIntegration(true)
    },
    {
      id: 'opensea',
      name: 'OpenSea',
      icon: Anchor,
      color: 'text-cyan-400',
      description: 'View and manage your NFTs stored on BlockDrive.',
      onClick: () => {}
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: MessageSquare,
      color: 'text-blue-400',
      description: 'Share and receive files through Telegram with blockchain-backed security.',
      onClick: () => {}
    },
    {
      id: 'netsuite',
      name: 'Oracle NetSuite',
      icon: Database,
      color: 'text-red-500',
      description: 'Integrate with Oracle NetSuite for enterprise resource planning and document management.',
      onClick: () => {}
    },
    {
      id: 'aws',
      name: 'AWS',
      icon: CloudCog,
      color: 'text-orange-500',
      description: 'Connect Amazon Web Services for scalable cloud infrastructure and storage solutions.',
      onClick: () => {}
    },
    {
      id: 'gcp',
      name: 'Google Cloud Services',
      icon: Server,
      color: 'text-blue-500',
      description: 'Integrate with Google Cloud Platform for advanced computing and storage capabilities.',
      onClick: () => {}
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      icon: CloudCog,
      color: 'text-blue-600',
      description: 'Connect Microsoft Azure for enterprise-grade cloud services and data management.',
      onClick: () => {}
    },
    {
      id: 'ibm',
      name: 'IBM Cloud',
      icon: Server,
      color: 'text-blue-700',
      description: 'Leverage IBM Cloud for AI-powered insights and secure data storage.',
      onClick: () => {}
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      icon: Building2,
      color: 'text-cyan-500',
      description: 'Sync customer data and documents with Salesforce CRM platform.',
      onClick: () => {}
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: FileText,
      color: 'text-gray-400',
      description: 'Connect Notion workspaces to sync documents and collaborative content.',
      onClick: () => {}
    },
    {
      id: 'asana',
      name: 'Asana',
      icon: CheckSquare,
      color: 'text-pink-500',
      description: 'Integrate project management workflows and attach files to Asana tasks.',
      onClick: () => {}
    },
    {
      id: 'mercury',
      name: 'Mercury',
      icon: DollarSign,
      color: 'text-purple-500',
      description: 'Connect your Mercury banking for automated financial document storage.',
      onClick: () => {}
    },
    {
      id: 'xero',
      name: 'Xero',
      icon: Calculator,
      color: 'text-teal-500',
      description: 'Sync accounting data and financial documents with Xero platform.',
      onClick: () => {}
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      icon: Calculator,
      color: 'text-green-600',
      description: 'Integrate QuickBooks for seamless bookkeeping and invoice management.',
      onClick: () => {}
    },
    {
      id: 'apollo',
      name: 'Apollo',
      icon: Users,
      color: 'text-indigo-500',
      description: 'Connect Apollo.io for sales intelligence and contact data management.',
      onClick: () => {}
    },
    {
      id: 'pipedrive',
      name: 'Pipedrive',
      icon: TrendingUp,
      color: 'text-green-500',
      description: 'Integrate Pipedrive CRM for sales pipeline management and document tracking.',
      onClick: () => {}
    },
    {
      id: 'gusto',
      name: 'Gusto',
      icon: Heart,
      color: 'text-red-400',
      description: 'Connect Gusto for automated payroll and HR document management.',
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Integrations</h1>
                <p className="text-muted-foreground">Connect BlockDrive with your favorite tools and services</p>
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
                  variant={isOnIntegrations ? "default" : "outline"}
                  className={isOnIntegrations 
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50"
                  }
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-5 hover:border-primary/30 hover:bg-card/70 transition-all group"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <integration.icon className={`w-5 h-5 ${integration.color}`} />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {integration.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                    {integration.description}
                  </p>
                  <Button
                    onClick={integration.onClick}
                    variant="outline"
                    size="sm"
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
