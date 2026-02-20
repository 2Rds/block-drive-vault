/**
 * Fund Wallet Card
 *
 * Dashboard CTA for users who pay with crypto.
 * Opens Dynamic's built-in funding UI (Coinbase, Banxa on-ramps)
 * configured in the Dynamic dashboard.
 */

import { Wallet, ArrowUpRight, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useDynamicWallet } from '@/hooks/useDynamicWallet';
import { useCryptoBalance } from '@/hooks/useCryptoBalance';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { useState } from 'react';

export function FundWalletCard() {
  const { isSignedIn } = useDynamicAuth();
  const { setShowDynamicUserProfile } = useDynamicContext();
  const { chainAddresses } = useDynamicWallet();
  const { baseUsdc, solanaUsdc, totalUsdc } = useCryptoBalance();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  if (!isSignedIn) return null;

  // Only show for users who have wallet addresses
  if (!chainAddresses.ethereum && !chainAddresses.solana) return null;

  const openFundingWidget = () => {
    // Open Dynamic's user profile widget which contains the funding tab
    setShowDynamicUserProfile(true);
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address).catch((err) => {
      console.warn('[FundWalletCard] Clipboard write failed:', err);
    });
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-medium text-foreground">Wallet Balance</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={openFundingWidget}
        >
          <ArrowUpRight className="w-3 h-3 mr-1" />
          Fund Wallet
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {chainAddresses.ethereum && (
          <div>
            <p className="text-xs text-muted-foreground">Base (USDC)</p>
            <p className="text-lg font-semibold text-foreground">${baseUsdc.toFixed(2)}</p>
            <button
              onClick={() => copyAddress(chainAddresses.ethereum!)}
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground flex items-center gap-1 mt-1"
            >
              {copiedAddress === chainAddresses.ethereum ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span className="truncate max-w-[120px] font-mono">
                {chainAddresses.ethereum}
              </span>
            </button>
          </div>
        )}
        {chainAddresses.solana && (
          <div>
            <p className="text-xs text-muted-foreground">Solana (USDC)</p>
            <p className="text-lg font-semibold text-foreground">${solanaUsdc.toFixed(2)}</p>
            <button
              onClick={() => copyAddress(chainAddresses.solana!)}
              className="text-xs text-muted-foreground/70 hover:text-muted-foreground flex items-center gap-1 mt-1"
            >
              {copiedAddress === chainAddresses.solana ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span className="truncate max-w-[120px] font-mono">
                {chainAddresses.solana}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
