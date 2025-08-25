import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Globe, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
export const LandingHero = () => {
  const navigate = useNavigate();
  return <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background">
      <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:50px_50px]" />
      <div className="relative max-w-7xl mx-auto px-6 py-32 text-center">
        {/* Announcement Banner */}
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 mb-8">
          <span className="text-sm font-medium text-primary">New</span>
          <div className="mx-2 h-4 w-px bg-primary/20" />
          <span className="text-sm text-muted-foreground">Introducing Multi-Chain Wallet Authentication</span>
          <ArrowRight className="ml-2 h-3 w-3 text-primary" />
        </div>

        {/* Main Hero */}
        <h1 className="text-6xl font-bold tracking-tight text-foreground mb-6">
          The <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">Web3</span>
          <br />
          Data Management Platform
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">From IPFS storage to blockchain authentication and multi-chain wallet integration, BlockDrive provides all the tools you need to manage your data securely with enterprise-grade security and performance.</p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button size="lg" className="text-lg px-8 py-6 bg-primary hover:bg-primary/90" onClick={() => navigate('/auth')}>
            Start for Free
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/pricing')}>
            View Pricing
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider">
            🤝 Trusted by Web3 Teams Worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8" />
              <span className="font-semibold">Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-8 w-8" />
              <span className="font-semibold">Global CDN</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8" />
              <span className="font-semibold">Lightning Fast</span>
            </div>
          </div>
        </div>
      </div>
    </section>;
};