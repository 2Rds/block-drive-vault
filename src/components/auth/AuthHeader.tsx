import React from 'react';
import { MVPConnectButton } from './MVPConnectButton';

export const AuthHeader = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" alt="BlockDrive Logo" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BlockDrive</h1>
            <p className="text-xs text-muted-foreground">Web3 Data Management Platform</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-48">
            <MVPConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
};
