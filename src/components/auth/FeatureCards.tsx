
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Globe, HardDrive, Zap } from 'lucide-react';

export const FeatureCards = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-card/60 to-purple-900/20 border-primary/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg backdrop-blur-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Multi-Chain Wallet Authentication</h3>
              <p className="text-muted-foreground text-sm mb-3">Secure authentication using wallet signatures across both Solana and EVM ecosystems. Connect with your preferred wallet for seamless access to decentralized storage.</p>
              <div className="flex items-center space-x-2 text-xs text-primary">
                <Shield className="w-3 h-3" />
                <span>Wallet Signatures • Multi-Chain • Secure Authentication</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/60 to-purple-800/20 border-accent/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-lg backdrop-blur-sm">
              <Globe className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Decentralized Identity System</h3>
              <p className="text-muted-foreground text-sm">Create personalized blockchain identities that work across multiple ecosystems. Your wallet address becomes your universal identity for secure file access and storage.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/60 to-purple-700/20 border-purple-400/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg backdrop-blur-sm">
              <HardDrive className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Decentralized File Storage</h3>
              <p className="text-muted-foreground text-sm mb-3">Store your files on IPFS with blockchain-verified ownership. Upload documents, images, and media with cryptographic proof of authenticity and permanent availability.</p>
              <div className="flex items-center space-x-2 text-xs text-purple-300">
                <HardDrive className="w-3 h-3" />
                <span>IPFS Storage • Blockchain Verified • Permanent Access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-card/60 to-indigo-900/20 border-indigo-400/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 rounded-lg backdrop-blur-sm">
              <Zap className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-semibold text-card-foreground mb-2">Lightning-Fast Web3 Experience</h3>
              <p className="text-muted-foreground text-sm mb-3">Experience blazing-fast uploads and downloads with our optimized IPFS infrastructure. Organize files in folders, share with custom links, and manage everything through an intuitive dashboard.</p>
              <div className="flex items-center space-x-2 text-xs text-indigo-300">
                <Zap className="w-3 h-3" />
                <span>Fast Uploads • Folder Organization • Shareable Links</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gradient-to-br from-card/60 to-purple-900/20 border border-border rounded-xl p-4 backdrop-blur-sm">
        <h4 className="font-semibold text-card-foreground mb-2 text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Ready to experience Web3 storage?</h4>
        <p className="text-muted-foreground text-xs mb-3">
          Connect your wallet above to access decentralized storage with multi-chain support.
        </p>
        <div className="flex items-center space-x-2 text-xs text-primary">
          <Shield className="w-4 h-4" />
          <span>Multi-Chain • Wallet Secured</span>
        </div>
      </div>
    </div>
  );
};
