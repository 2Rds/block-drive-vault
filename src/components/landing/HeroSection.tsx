import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="py-24 px-8 bg-gradient-to-br from-background via-background to-card/30">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-8">
          <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            🚀 Decentralized Storage Platform
          </span>
        </div>
        
        <h1 className="text-7xl font-bold text-foreground mb-8 leading-tight">
          Store Files{' '}
          <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
            Securely
          </span>{' '}
          <br />
          Without Limits
        </h1>
        
        <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          BlockDrive creates a secure environment for storing and managing your files 
          with decentralized technology, eliminating data loss and access restrictions.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-medium rounded-xl">
            Start Storing Files
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-medium rounded-xl">
            <Play className="mr-2 w-5 h-5" />
            Watch Demo
          </Button>
        </div>

        {/* Featured Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl p-8">
            <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
            <div className="text-muted-foreground">Uptime Guarantee</div>
          </div>
          <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl p-8">
            <div className="text-3xl font-bold text-primary mb-2">256-bit</div>
            <div className="text-muted-foreground">AES Encryption</div>
          </div>
          <div className="bg-card/30 backdrop-blur-sm border border-border rounded-2xl p-8">
            <div className="text-3xl font-bold text-primary mb-2">Global</div>
            <div className="text-muted-foreground">CDN Network</div>
          </div>
        </div>
      </div>
    </section>
  );
};