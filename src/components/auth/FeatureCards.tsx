
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Globe, HardDrive, Zap } from 'lucide-react';

export const FeatureCards = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-card/40 border-border border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Solana Wallet Authentication</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Secure authentication using Solana wallet signatures. Connect with Phantom, Solflare, or any Solana wallet for seamless access to decentralized storage on the fastest blockchain.
              </p>
              <div className="flex items-center space-x-2 text-xs text-primary">
                <Shield className="w-3 h-3" />
                <span>Solana Signatures • Lightning Fast • Secure Authentication</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-gradient-to-r from-blue-600/30 via-blue-500/30 to-purple-600/30 border-2">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-600/20 via-blue-500/20 to-purple-600/20 rounded-lg">
              <HardDrive className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Decentralized File Storage</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Store your files on IPFS with Solana blockchain verification. Upload documents, images, and media with cryptographic proof of authenticity and permanent availability on Solana's network.
              </p>
              <div className="flex items-center space-x-2 text-xs text-blue-400">
                <HardDrive className="w-3 h-3" />
                <span>IPFS Storage • Solana Verified • Permanent Access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/40 border-border border-muted/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-muted/40 rounded-lg">
              <Zap className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Lightning-Fast Solana Experience</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Experience blazing-fast uploads and downloads powered by Solana's high-performance blockchain. Organize files in folders, share with custom links, and manage everything through an intuitive dashboard.
              </p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>Solana Speed • Folder Organization • Shareable Links</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card/40 border border-border rounded-xl p-4">
        <h4 className="font-semibold text-card-foreground mb-2 text-sm">Ready to experience Solana storage?</h4>
        <p className="text-muted-foreground text-xs mb-3">
          Connect your Solana wallet or create an account to access decentralized storage on the fastest blockchain.
        </p>
        <div className="flex items-center space-x-2 text-xs text-primary">
          <Shield className="w-4 h-4" />
          <span>Solana Powered • Wallet Secured</span>
        </div>
      </div>
    </div>
  );
};
