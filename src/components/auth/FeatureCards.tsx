import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Globe, HardDrive, Zap } from 'lucide-react';
export const FeatureCards = () => {
  return <div className="space-y-6">
      <Card className="bg-card/40 border-border border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary/20 rounded-lg">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Multi-Chain Wallet Authentication</h3>
              <p className="text-muted-foreground text-sm mb-3">Secure authentication using wallet signatures across both Solana and EVM ecosystems. Connect with your preferred wallet for seamless access to decentralized storage.</p>
              <div className="flex items-center space-x-2 text-xs text-primary">
                <Shield className="w-3 h-3" />
                <span>Wallet Signatures • Multi-Chain • Secure Authentication</span>
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
              <p className="text-muted-foreground text-sm mb-3">Store your files on IPFS with blockchain-verified ownership. Upload documents, images, and media with cryptographic proof of authenticity and permanent availability.</p>
              <div className="flex items-center space-x-2 text-xs text-blue-400">
                <HardDrive className="w-3 h-3" />
                <span>IPFS Storage • Blockchain Verified • Permanent Access</span>
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
              <h3 className="font-semibold text-card-foreground mb-2">Lightning-Fast Web3 Experience</h3>
              <p className="text-muted-foreground text-sm mb-3">Experience blazing-fast uploads and downloads with our optimized IPFS infrastructure. Organize files in folders, share with custom links, and manage everything through an intuitive dashboard.</p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>Fast Uploads • Folder Organization • Shareable Links</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card/40 border border-border rounded-xl p-4">
        <h4 className="font-semibold text-card-foreground mb-2 text-sm">Ready to experience Web3 storage?</h4>
        <p className="text-muted-foreground text-xs mb-3">
          Connect your wallet above to access decentralized storage with multi-chain support.
        </p>
        <div className="flex items-center space-x-2 text-xs text-primary">
          <Shield className="w-4 h-4" />
          <span>Multi-Chain • Wallet Secured</span>
        </div>
      </div>
    </div>;
};