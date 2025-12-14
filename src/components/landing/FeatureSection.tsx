import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Shield, 
  Lock,
  CloudUpload,
  Bot,
  RefreshCcw
} from 'lucide-react';

const features = [
  {
    icon: Lock,
    title: "Programmed Incompleteness",
    description: "Proprietary architecture splits encrypted files: critical bytes in ZK proofs, content across providers. Theft-proof by design.",
    highlight: "Theft-Proof"
  },
  {
    icon: RefreshCcw,
    title: "Instant Revoke Sharing",
    description: "Share files while retaining control. Revoke access instantly - files become permanently unreadable.",
    highlight: "Unique"
  },
  {
    icon: Shield,
    title: "On-Chain Registry",
    description: "Solana program records all files and delegations. Immutable audit trail with cryptographic commitments.",
    highlight: "Blockchain"
  },
  {
    icon: Database,
    title: "Multi-Provider Storage",
    description: "IPFS, S3, and Arweave with automatic failover. 99.9% uptime guaranteed.",
    highlight: "Redundant"
  },
  {
    icon: Bot,
    title: "AI Agents",
    description: "Premium AI assistants for marketing, sales, and project management. Automate your workflows.",
    highlight: "4 Agents"
  },
  {
    icon: CloudUpload,
    title: "20+ Integrations",
    description: "Connect Slack, Drive, OneDrive, Salesforce, and more. Enterprise-ready from day one.",
    highlight: "Enterprise"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
