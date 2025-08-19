import React from 'react';
import { Button } from '@/components/ui/button';

export const AuthHeader = () => {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">BlockDrive</h1>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#docs" className="text-muted-foreground hover:text-foreground transition-colors">Docs</a>
          <Button variant="outline" size="sm">Sign In</Button>
        </nav>
      </div>
    </header>
  );
};