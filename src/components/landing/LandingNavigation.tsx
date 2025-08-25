import React from 'react';
import { Button } from '@/components/ui/button';
import { DynamicConnectButton } from '@/components/auth/DynamicConnectButton';
import { useNavigate } from 'react-router-dom';

export const LandingNavigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center">
              <img 
                src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" 
                alt="BlockDrive Logo" 
                className="w-8 h-8 object-contain" 
              />
            </div>
            <span className="text-xl font-bold text-foreground">BlockDrive</span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </button>
            <button 
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => navigate('/pricing')}
            >
              Pricing
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </button>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              Company
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <DynamicConnectButton onConnectClick={() => {}} />
          </div>
        </div>
      </div>
    </nav>
  );
};