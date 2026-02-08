/**
 * Advanced Settings Component
 *
 * Shows technical details like wallet address for troubleshooting purposes.
 * NOT prominently displayed - hidden in Account settings for advanced users.
 *
 * Purpose: Provide access to wallet address for support/troubleshooting,
 * without confusing regular users with crypto terminology.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Shield,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const AdvancedSettings: React.FC = () => {
  const { walletAddress, isInitialized } = useCrossmintWallet();
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Copy wallet address to clipboard
   */
  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Wallet address copied to clipboard');
    }
  };

  /**
   * Open wallet in Solana Explorer
   */
  const handleOpenExplorer = () => {
    if (walletAddress) {
      window.open(
        `https://explorer.solana.com/address/${walletAddress}?cluster=devnet`,
        '_blank'
      );
    }
  };

  /**
   * Truncate address for display
   */
  const truncateAddress = (address: string | null): string => {
    if (!address) return 'Not available';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return (
    <Card className="bg-card border border-border/50 rounded-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-yellow-400" />
              Advanced Settings
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Technical information for troubleshooting and support
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Warning notice */}
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium mb-1">For Advanced Users Only</h4>
                <p className="text-sm text-yellow-300">
                  This section contains technical information about your account infrastructure.
                  Only modify these settings if you know what you're doing or if instructed by support.
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-foreground font-medium flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                Embedded Wallet Address
              </h4>
              <Badge variant="secondary" className="bg-muted text-muted-foreground">
                {isInitialized ? 'Active' : 'Initializing'}
              </Badge>
            </div>

            <div className="p-4 bg-background border border-border/50 rounded-lg">
              {/* Wallet address */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Solana Address (Devnet)</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-muted/50 text-muted-foreground font-mono text-sm rounded border border-border/50">
                      {isInitialized ? truncateAddress(walletAddress) : 'Initializing...'}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAddress}
                      disabled={!isInitialized}
                      className="border-border text-muted-foreground hover:bg-muted/30"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenExplorer}
                      disabled={!isInitialized}
                      className="border-border text-muted-foreground hover:bg-muted/30"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Full address (for copying) */}
                {isInitialized && walletAddress && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Full Address</p>
                    <code className="block px-3 py-2 bg-muted/50 text-muted-foreground font-mono text-xs rounded border border-border/50 break-all">
                      {walletAddress}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Wallet Purpose Info */}
          <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              What is this wallet used for?
            </h4>
            <ul className="text-sm text-blue-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></span>
                <span>Holds your membership NFT (soulbound token)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></span>
                <span>Derives encryption keys for file security</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></span>
                <span>Receives gas sponsorship for transactions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2"></span>
                <span>Links to your BlockDrive subdomain (Phase 2)</span>
              </li>
            </ul>
          </div>

          {/* Important Note */}
          <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
            <h4 className="text-muted-foreground font-medium mb-2">Important Notes</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• This wallet is NOT used for subscription payments</li>
              <li>• Gas fees are automatically sponsored (no SOL needed)</li>
              <li>• Your membership NFT is non-transferable (soulbound)</li>
              <li>• This address is for reference only - do not send funds to it</li>
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default AdvancedSettings;
