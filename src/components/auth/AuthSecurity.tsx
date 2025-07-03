
import React from 'react';
import { Shield } from 'lucide-react';

export const AuthSecurity = () => {
  return (
    <div className="bg-card/40 border border-border rounded-xl p-6">
      <h4 className="font-semibold text-card-foreground mb-3 flex items-center">
        <Shield className="w-5 h-5 mr-2 text-primary" />
        Enterprise-Grade Security
      </h4>
      <p className="text-muted-foreground text-sm mb-4">
        Connect your wallet to access BlockDrive's comprehensive data management suite. 
        Your private keys remain secure while enabling seamless interaction with decentralized storage networks.
      </p>
      <div className="flex items-center space-x-2 text-xs text-primary">
        <Shield className="w-4 h-4" />
        <span>Wallet Secured • Zero-Knowledge • Self-Custody</span>
      </div>
    </div>
  );
};
