
import React from 'react';
import { Shield, Cloud, Zap } from 'lucide-react';

export const AuthHero = () => {
  return (
    <div className="text-center mb-16">
      <div className="mb-4">
        <span className="text-primary text-sm font-medium tracking-wider uppercase">
          Web3 Data Management Platform
        </span>
      </div>
      
      <h1 className="text-6xl font-bold text-foreground mb-6 leading-tight">
        Store Files{' '}
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Securely
        </span>{' '}
        Without Limits
      </h1>
      
      <p className="text-muted-foreground text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
        BlockDrive creates a secure environment for storing and managing your files 
        with decentralized technology, eliminating data loss and access restrictions.
      </p>
      
      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-card/70 transition-all duration-300">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Secure Storage</h3>
          <p className="text-muted-foreground text-sm">
            Military-grade encryption with blockchain-verified integrity for all your files.
          </p>
        </div>
        
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-card/70 transition-all duration-300">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <Cloud className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">IPFS Integration</h3>
          <p className="text-muted-foreground text-sm">
            Decentralized storage that ensures your data is always accessible and permanent.
          </p>
        </div>
        
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:bg-card/70 transition-all duration-300">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Lightning Fast</h3>
          <p className="text-muted-foreground text-sm">
            Optimized upload and retrieval speeds with global CDN distribution.
          </p>
        </div>
      </div>
    </div>
  );
};
