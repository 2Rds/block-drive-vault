
import React from 'react';
import { Database, Globe, Zap } from 'lucide-react';

export const AuthHero = () => {
  return (
    <div className="text-center mb-12">
      <h2 className="text-4xl font-bold text-foreground mb-6">
        Welcome to BlockDrive
        <br />
        <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
          Next-Generation Web3 Data Management
        </span>
      </h2>
      <p className="text-muted-foreground text-lg mb-8 max-w-3xl mx-auto">
        Transform how you store, manage, and share data across the decentralized web. 
        BlockDrive combines the power of IPFS, blockchain technology, and multi-chain wallet integration 
        to deliver enterprise-grade data management with complete ownership control.
      </p>
      
      {/* Feature Badges */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <div className="flex items-center justify-center p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Database className="w-5 h-5 text-primary mr-2" />
          <span className="text-primary text-sm font-medium">Decentralized Storage</span>
        </div>
        <div className="flex items-center justify-center p-3 bg-gradient-to-r from-blue-600/10 via-blue-500/10 to-purple-600/10 rounded-lg border border-blue-500/30">
          <Globe className="w-5 h-5 text-blue-400 mr-2" />
          <span className="text-blue-400 text-sm font-medium">Multi-Chain Support</span>
        </div>
        <div className="flex items-center justify-center p-3 bg-secondary/20 rounded-lg border border-secondary/30">
          <Zap className="w-5 h-5 text-secondary-foreground mr-2" />
          <span className="text-secondary-foreground text-sm font-medium">Lightning Fast</span>
        </div>
      </div>
    </div>
  );
};
