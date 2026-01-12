import React from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Globe, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ClerkConnectButton } from '@/components/auth/ClerkConnectButton';

export const LandingHero = () => {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-card to-background">
      <div className="absolute inset-0 bg-grid-black/[0.02] bg-[size:50px_50px]" />
      <div className="hero-container relative max-w-7xl mx-auto px-6 py-32 text-center">
        {/* Main Hero - Optimized for immediate LCP render */}
        <h1 className="hero-title text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
          The <span className="hero-gradient bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">Private</span>
          <br />
          Data Management Platform
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
          Theft-proof architecture through Programmed Incompleteness, zero-knowledge encryption with wallet-derived keys, and instant-revoke file sharing. Your files are split across providers and can never be stolen—even by us.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <ClerkConnectButton variant="hero" />
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
    </section>
  );
};
