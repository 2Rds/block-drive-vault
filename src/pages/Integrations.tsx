import { useState } from 'react';
import { AppShell } from "@/components/layout";
import { Button } from '@/components/ui/button';
import {
  Slack, Cloud, HardDrive, Box, Anchor, MessageSquare, Database,
  CloudCog, Server, Building2, FileText, CheckSquare, Briefcase,
  DollarSign, Calculator, Users, TrendingUp, Heart,
  Files, LucideIcon
} from 'lucide-react';
import { SlackIntegration } from '@/components/SlackIntegration';
import { OneDriveIntegration } from '@/components/integrations/OneDriveIntegration';
import { GoogleDriveIntegration } from '@/components/integrations/GoogleDriveIntegration';
import { BoxIntegration } from '@/components/integrations/BoxIntegration';
import { OtoCoIntegration } from '@/components/integrations/OtoCoIntegration';
import { StripeAtlasIntegration } from '@/components/integrations/StripeAtlasIntegration';
import { ClerkyIntegration } from '@/components/integrations/ClerkyIntegration';
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

type IntegrationKey = 'slack' | 'onedrive' | 'googledrive' | 'box' | 'otoco' | 'stripe-atlas' | 'clerky';

interface IntegrationConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
  modalKey?: IntegrationKey;
}

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
  { id: 'notion', name: 'Notion', icon: FileText, color: 'text-muted-foreground', description: 'Connect Notion workspaces to sync documents and collaborative content.' },
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

function Integrations(): JSX.Element {
  useBoxOAuth();
  const [activeModal, setActiveModal] = useState<IntegrationKey | null>(null);

  const handleIntegrationClick = (modalKey?: IntegrationKey) => {
    if (modalKey) {
      setActiveModal(modalKey);
    }
  };

  return (
    <AppShell
      title="Integrations"
      description="Connect BlockDrive with your favorite tools and services"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="bg-card border border-border/50 rounded-xl p-5 hover:border-border transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-muted/30">
                <integration.icon className={`w-5 h-5 ${integration.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {integration.name}
              </h3>
            </div>
            <p className="text-sm text-foreground-muted mb-4 line-clamp-2 min-h-[40px]">
              {integration.description}
            </p>
            <Button
              onClick={() => handleIntegrationClick(integration.modalKey)}
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!integration.modalKey}
            >
              {integration.modalKey ? 'Connect' : 'Coming Soon'}
            </Button>
          </div>
        ))}
      </div>

      {/* Integration Modals */}
      <SlackIntegration isOpen={activeModal === 'slack'} onClose={() => setActiveModal(null)} />
      <OneDriveIntegration isOpen={activeModal === 'onedrive'} onClose={() => setActiveModal(null)} />
      <GoogleDriveIntegration isOpen={activeModal === 'googledrive'} onClose={() => setActiveModal(null)} />
      <BoxIntegration isOpen={activeModal === 'box'} onClose={() => setActiveModal(null)} />
      <OtoCoIntegration isOpen={activeModal === 'otoco'} onClose={() => setActiveModal(null)} />
      <StripeAtlasIntegration isOpen={activeModal === 'stripe-atlas'} onClose={() => setActiveModal(null)} />
      <ClerkyIntegration isOpen={activeModal === 'clerky'} onClose={() => setActiveModal(null)} />
    </AppShell>
  );
}

export default Integrations;
