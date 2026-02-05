import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Button } from '@/components/ui/button';
import {
  Slack, Cloud, HardDrive, Box, Anchor, MessageSquare, Database,
  CloudCog, Server, Building2, FileText, CheckSquare, Briefcase,
  DollarSign, Calculator, Users, TrendingUp, Heart, BarChart3,
  Files, Puzzle, Settings, LucideIcon
} from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { OtoCoIntegration } from '@/components/integrations/OtoCoIntegration';
import { StripeAtlasIntegration } from '@/components/integrations/StripeAtlasIntegration';
import { ClerkyIntegration } from '@/components/integrations/ClerkyIntegration';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

type IntegrationKey = 'slack' | 'onedrive' | 'googledrive' | 'box' | 'otoco' | 'stripe-atlas' | 'clerky';

interface IntegrationConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  modalKey?: IntegrationKey;
}

const TEAM_TIERS = ['growth', 'scale'] as const;

const NAV_BUTTON_STYLES = {
  active: "bg-primary hover:bg-primary/90 text-primary-foreground",
  inactive: "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50",
} as const;

const INTEGRATIONS: IntegrationConfig[] = [
  { id: 'slack', name: 'Slack', icon: Slack, color: 'text-purple-400', description: 'Connect your Slack workspace to share files and collaborate with your team.', modalKey: 'slack' },
  { id: 'onedrive', name: 'OneDrive', icon: Cloud, color: 'text-blue-500', description: 'Sync your OneDrive files with BlockDrive for seamless cloud storage.', modalKey: 'onedrive' },
  { id: 'googledrive', name: 'Google Drive', icon: HardDrive, color: 'text-yellow-500', description: 'Import and export files between Google Drive and BlockDrive.', modalKey: 'googledrive' },
  { id: 'dropbox', name: 'Dropbox', icon: Box, color: 'text-blue-400', description: 'Connect Dropbox to access your files on the blockchain.', modalKey: 'box' },
  { id: 'opensea', name: 'OpenSea', icon: Anchor, color: 'text-cyan-400', description: 'View and manage your NFTs stored on BlockDrive.' },
  { id: 'telegram', name: 'Telegram', icon: MessageSquare, color: 'text-blue-400', description: 'Share and receive files through Telegram with blockchain-backed security.' },
  { id: 'netsuite', name: 'Oracle NetSuite', icon: Database, color: 'text-red-500', description: 'Integrate with Oracle NetSuite for enterprise resource planning and document management.' },
  { id: 'aws', name: 'AWS', icon: CloudCog, color: 'text-orange-500', description: 'Connect Amazon Web Services for scalable cloud infrastructure and storage solutions.' },
  { id: 'gcp', name: 'Google Cloud Services', icon: Server, color: 'text-blue-500', description: 'Integrate with Google Cloud Platform for advanced computing and storage capabilities.' },
  { id: 'azure', name: 'Microsoft Azure', icon: CloudCog, color: 'text-blue-600', description: 'Connect Microsoft Azure for enterprise-grade cloud services and data management.' },
  { id: 'ibm', name: 'IBM Cloud', icon: Server, color: 'text-blue-700', description: 'Leverage IBM Cloud for AI-powered insights and secure data storage.' },
  { id: 'salesforce', name: 'Salesforce', icon: Building2, color: 'text-cyan-500', description: 'Sync customer data and documents with Salesforce CRM platform.' },
  { id: 'notion', name: 'Notion', icon: FileText, color: 'text-gray-400', description: 'Connect Notion workspaces to sync documents and collaborative content.' },
  { id: 'asana', name: 'Asana', icon: CheckSquare, color: 'text-pink-500', description: 'Integrate project management workflows and attach files to Asana tasks.' },
  { id: 'mercury', name: 'Mercury', icon: DollarSign, color: 'text-purple-500', description: 'Connect your Mercury banking for automated financial document storage.' },
  { id: 'xero', name: 'Xero', icon: Calculator, color: 'text-teal-500', description: 'Sync accounting data and financial documents with Xero platform.' },
  { id: 'quickbooks', name: 'QuickBooks', icon: Calculator, color: 'text-green-600', description: 'Integrate QuickBooks for seamless bookkeeping and invoice management.' },
  { id: 'apollo', name: 'Apollo', icon: Users, color: 'text-indigo-500', description: 'Connect Apollo.io for sales intelligence and contact data management.' },
  { id: 'pipedrive', name: 'Pipedrive', icon: TrendingUp, color: 'text-green-500', description: 'Integrate Pipedrive CRM for sales pipeline management and document tracking.' },
  { id: 'gusto', name: 'Gusto', icon: Heart, color: 'text-red-400', description: 'Connect Gusto for automated payroll and HR document management.' },
  { id: 'otoco', name: 'OtoCo', icon: Building2, color: 'text-emerald-500', description: 'Instantly spin up an onchain LLC or Delaware C-Corp without leaving BlockDrive.', modalKey: 'otoco' },
  { id: 'stripe-atlas', name: 'Stripe Atlas', icon: Briefcase, color: 'text-violet-500', description: 'Form a Delaware C-Corp with integrated Stripe payments and banking.', modalKey: 'stripe-atlas' },
  { id: 'clerky', name: 'Clerky', icon: Files, color: 'text-blue-500', description: 'VC-standard legal paperwork for startups, built by lawyers.', modalKey: 'clerky' },
];

function canAccessTeamsFeature(subscriptionStatus: { subscribed?: boolean; subscription_tier?: string } | null): boolean {
  if (!subscriptionStatus?.subscribed) return false;
  const tier = subscriptionStatus.subscription_tier || 'free';
  return TEAM_TIERS.includes(tier as typeof TEAM_TIERS[number]);
}

function Integrations(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { openFolders, toggleFolder } = useFolderNavigation();
  useBoxOAuth();
  const { subscriptionStatus } = useSubscriptionStatus();

  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeModal, setActiveModal] = useState<IntegrationKey | null>(null);

  const canAccessTeams = canAccessTeamsFeature(subscriptionStatus);
  const isOnIntegrations = location.pathname === '/integrations';

  const handleIntegrationClick = (modalKey?: IntegrationKey) => {
    if (modalKey) {
      setActiveModal(modalKey);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      <Header />
      <div className="flex">
        <Sidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onFolderClick={toggleFolder}
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
                <Button onClick={() => navigate('/dashboard')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button onClick={() => navigate('/files')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  variant={isOnIntegrations ? "default" : "outline"}
                  className={isOnIntegrations ? NAV_BUTTON_STYLES.active : NAV_BUTTON_STYLES.inactive}
                >
                  <Puzzle className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
                {canAccessTeams && (
                  <Button
                    onClick={() => navigate('/teams')}
                    variant="outline"
                    className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                  </Button>
                )}
                <Button onClick={() => navigate('/account')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {INTEGRATIONS.map((integration) => (
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
                    onClick={() => handleIntegrationClick(integration.modalKey)}
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

      <SlackIntegration isOpen={activeModal === 'slack'} onClose={() => setActiveModal(null)} />
      <OneDriveIntegration isOpen={activeModal === 'onedrive'} onClose={() => setActiveModal(null)} />
      <GoogleDriveIntegration isOpen={activeModal === 'googledrive'} onClose={() => setActiveModal(null)} />
      <BoxIntegration isOpen={activeModal === 'box'} onClose={() => setActiveModal(null)} />
      <OtoCoIntegration isOpen={activeModal === 'otoco'} onClose={() => setActiveModal(null)} />
      <StripeAtlasIntegration isOpen={activeModal === 'stripe-atlas'} onClose={() => setActiveModal(null)} />
      <ClerkyIntegration isOpen={activeModal === 'clerky'} onClose={() => setActiveModal(null)} />
    </div>
  );
}

export default Integrations;
