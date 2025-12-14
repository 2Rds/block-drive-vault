import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Shield, 
  Zap, 
  Wallet, 
  Lock,
  CloudUpload,
  BarChart3,
  FileKey,
  Bot,
  Building2,
  Users,
  RefreshCcw
} from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: "Programmed Incompleteness + ZK Encryption",
    description: "Proprietary architecture splits AES-256-GCM encrypted files: critical bytes stored in Groth16 ZK proofs, content across multi-provider storage. Wallet-derived keys never touch our servers.",
    highlight: "Theft-Proof"
  },
  {
    icon: Database,
    title: "Multi-Provider Storage",
    description: "Filebase IPFS, Amazon S3, and Arweave with automatic failover. Your files stay available with 99.9% uptime guarantee.",
    highlight: "99.9% Uptime"
  },
  {
    icon: RefreshCcw,
    title: "Instant Revoke Sharing",
    description: "Share encrypted files while retaining control. Revoke access instantly by deleting on-chain critical bytes - files become unreadable.",
    highlight: "Unique to BlockDrive"
  },
  {
    icon: Shield,
    title: "On-Chain File Registry",
    description: "Solana Anchor program records all files, delegations, and access. Immutable audit trail with cryptographic commitments.",
    highlight: "Blockchain-Backed"
  },
  {
    icon: Bot,
    title: "AI Agents",
    description: "Premium AI assistants for marketing, sales, project management, and executive tasks. Automate your business workflows.",
    highlight: "4 Agents"
  },
  {
    icon: Building2,
    title: "Business Formation",
    description: "Spin up onchain LLCs with OtoCo, form C-Corps via Stripe Atlas, or get VC-standard legal docs from Clerky - without leaving BlockDrive.",
    highlight: "One-Click LLC"
  },
  {
    icon: CloudUpload,
    title: "20+ Integrations",
    description: "Connect Slack, Google Drive, OneDrive, Salesforce, Notion, QuickBooks, and more. Migrate your existing workflows seamlessly.",
    highlight: "Enterprise Ready"
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Create teams, manage permissions, and share files securely. Role-based access control with encrypted team workspaces.",
    highlight: "Teams Built-In"
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Monitor storage usage, network health, ZK proof status, and security events. Performance insights across all providers.",
    highlight: "Live Metrics"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Global CDN with edge locations worldwide ensures sub-100ms response times. Optimized for enterprise-scale operations.",
    highlight: "< 100ms Latency"
  }
];

export const FeatureSection = () => {
  return (
    <section className="py-24 bg-card/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            The most secure data privacy infrastructure ever built
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            BlockDrive combines zero-knowledge cryptography, multi-chain authentication, 
            and programmed incompleteness for security that's mathematically unbreakable.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
