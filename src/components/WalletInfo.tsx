
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, Activity, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { toast } from 'sonner';

export const WalletInfo = () => {
  const { user, solanaWalletAddress, isWalletReady } = useAuth();
  const crossmintWallet = useCrossmintWallet();

  // Use Crossmint wallet address preferentially
  const walletAddress = crossmintWallet.walletAddress || solanaWalletAddress;
  const isLoading = crossmintWallet.isLoading;
  const isInitialized = crossmintWallet.isInitialized;

  const copyToClipboard = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      toast.success('Wallet address copied!');
    }
  };

  const openExplorer = () => {
    if (walletAddress) {
      window.open(`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`, '_blank');
    }
  };

  if (!user) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="bg-muted/50 border-border">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-foreground font-medium">Initializing Wallet</p>
              <p className="text-muted-foreground text-sm">Setting up your Crossmint embedded wallet...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wallet not ready yet
  if (!isInitialized || !walletAddress) {
    return (
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-yellow-500 font-medium">Wallet Pending</p>
              <p className="text-yellow-400/80 text-sm">Your embedded wallet is being provisioned...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wallet connected and ready
  return (
    <Card className="bg-green-500/10 border-green-500/30">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-green-500 font-medium">Crossmint Embedded Wallet</p>
                <p className="text-green-400/80 text-sm font-mono">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                <span className="text-green-400/80 text-sm">Secure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-green-400/80 text-sm">Active</span>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Network</p>
              <p className="text-foreground font-medium">Solana Devnet</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Provider</p>
              <p className="text-foreground font-medium">Crossmint</p>
            </div>
          </div>

          {/* Features */}
          <div className="bg-background/50 rounded-lg p-3">
            <p className="text-muted-foreground text-xs mb-2">Features</p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                Gas Sponsored
              </span>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                Non-Custodial
              </span>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                Embedded
              </span>
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                Multichain
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex-1"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openExplorer}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
