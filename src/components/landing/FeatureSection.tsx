import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Shield, 
  Zap, 
  Globe, 
  Wallet, 
  Lock,
  Server,
  CloudUpload,
  BarChart3
} from 'lucide-react';

const features = [
  {
    icon: Database,
    title: "Decentralized Storage",
    description: "Store files on IPFS with guaranteed availability and redundancy across the global network.",
    highlight: "99.9% Uptime"
  },
  {
    icon: Wallet,
    title: "Multi-Chain Wallet Support", 
    description: "Connect with Phantom, Solflare, MetaMask, and 50+ other wallets across Ethereum, Solana, and more.",
    highlight: "50+ Wallets"
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "End-to-end encryption, secure authentication, and comprehensive audit trails for your data.",
    highlight: "SOC 2 Compliant"
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Global CDN with edge locations worldwide ensures sub-100ms response times everywhere.",
    highlight: "< 100ms Latency"
  },
  {
    icon: CloudUpload,
    title: "Seamless Integration",
    description: "Connect with Slack, Google Drive, OneDrive, and Box. Import and sync your existing files.",
    highlight: "4+ Integrations"
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Real-time insights into storage usage, bandwidth, access patterns, and security events.",
    highlight: "Real-time Insights"
  }
];

export const FeatureSection = () => {
  return (
    <section className="py-24 bg-card/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Everything you need for Web3 data management
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for developers, loved by enterprises. BlockDrive combines the best of 
            decentralized storage with enterprise-grade features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
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