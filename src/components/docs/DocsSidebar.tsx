import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, FileText, Users, Shield, Zap, Settings, Code, Globe, Lock, Building2, Database } from 'lucide-react';

interface SidebarSection {
  title: string;
  icon: React.ReactNode;
  items: { title: string; id: string }[];
}

interface DocsSidebarProps {
  activeSection: string;
  onSectionClick: (id: string) => void;
}

export const DocsSidebar = ({ activeSection, onSectionClick }: DocsSidebarProps) => {
  const sections: SidebarSection[] = [
    {
      title: "Getting Started",
      icon: <Zap className="w-4 h-4" />,
      items: [
        { title: "Platform Overview", id: "overview" },
        { title: "Quick Start Guide", id: "quick-start" },
        { title: "Core Features", id: "core-features" }
      ]
    },
    {
      title: "Security & Cryptography",
      icon: <Lock className="w-4 h-4" />,
      items: [
        { title: "Programmed Incompleteness", id: "programmed-incompleteness" },
        { title: "AES-256 Encryption", id: "aes-encryption" },
        { title: "Zero-Knowledge Proofs", id: "zk-proofs" },
        { title: "Instant Revoke", id: "instant-revoke" }
      ]
    },
    {
      title: "Authentication",
      icon: <Shield className="w-4 h-4" />,
      items: [
        { title: "Multichain Auth (MCA)", id: "mca-auth" },
        { title: "SNS Domain Verification", id: "sns-verification" },
        { title: "Basenames Verification", id: "basenames-verification" },
        { title: "Wallet Connection", id: "wallet-auth" },
        { title: "Clerk + Crossmint Integration", id: "clerk-crossmint-integration" }
      ]
    },
    {
      title: "Storage & Files",
      icon: <FileText className="w-4 h-4" />,
      items: [
        { title: "Multi-Provider Storage", id: "multi-provider" },
        { title: "IPFS Integration", id: "ipfs-integration" },
        { title: "On-Chain Registry", id: "onchain-registry" },
        { title: "File Management", id: "file-management" },
        { title: "Storage Quotas", id: "storage-quotas" }
      ]
    },
    {
      title: "Solana Program",
      icon: <Database className="w-4 h-4" />,
      items: [
        { title: "Program Architecture", id: "solana-architecture" },
        { title: "UserVault PDA", id: "user-vault" },
        { title: "FileRecord PDA", id: "file-record" },
        { title: "Delegation PDA", id: "delegation" }
      ]
    },
    {
      title: "Team Collaboration",
      icon: <Users className="w-4 h-4" />,
      items: [
        { title: "Team Management", id: "team-management" },
        { title: "File Sharing", id: "file-sharing" },
        { title: "Access Control", id: "access-control" }
      ]
    },
    {
      title: "Business Formation",
      icon: <Building2 className="w-4 h-4" />,
      items: [
        { title: "OtoCo Integration", id: "otoco" },
        { title: "Stripe Atlas", id: "stripe-atlas" },
        { title: "Clerky", id: "clerky" }
      ]
    },
    {
      title: "Integrations",
      icon: <Globe className="w-4 h-4" />,
      items: [
        { title: "Cloud Storage", id: "cloud-storage" },
        { title: "Enterprise Systems", id: "enterprise-systems" },
        { title: "Financial Tools", id: "financial-tools" }
      ]
    },
    {
      title: "API & Development",
      icon: <Code className="w-4 h-4" />,
      items: [
        { title: "Edge Functions", id: "edge-functions" },
        { title: "SDK Integration", id: "sdk-integration" },
        { title: "ZK Circuit Compilation", id: "zk-circuits" }
      ]
    },
    {
      title: "Subscription & Pricing",
      icon: <Settings className="w-4 h-4" />,
      items: [
        { title: "Pricing Tiers", id: "pricing-tiers" },
        { title: "Billing Features", id: "billing" }
      ]
    }
  ];

  return (
    <div className="w-80 bg-muted/30 border-r border-border h-screen">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Documentation</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete guide to BlockDrive platform
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100vh-120px)]">
        <div className="p-4 space-y-6">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {section.icon}
                {section.title}
              </div>
              <div className="space-y-1 ml-6">
                {section.items.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    className={`w-full justify-start text-left h-8 px-3 ${
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary border-l-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                    onClick={() => onSectionClick(item.id)}
                  >
                    <span className="truncate">{item.title}</span>
                    {activeSection === item.id && (
                      <ChevronRight className="w-3 h-3 ml-auto" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
