import React from 'react';
import { Button } from '@/components/ui/button';

export const AuthHeader = () => {
  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold text-foreground">BlockDrive</h1>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Home</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Dashboard</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Teams</a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          
          {/* Connect Wallet Button */}
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Connect Wallet
          </Button>
        </div>
      </div>
    </header>
  );
};