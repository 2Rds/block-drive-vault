import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { PricingTier, BillingPeriod } from '@/types/pricing';

interface CryptoCheckoutModalProps {
  open: boolean;
  onClose: () => void;
  tier: PricingTier;
  billingPeriod: BillingPeriod;
  walletAddress?: string;
  walletBalance: number;
  requiredAmount: number;
  onProceed: () => Promise<void>;
  onRefreshBalance: () => Promise<void>;
}

type CheckoutStatus = 'idle' | 'checking' | 'processing' | 'success' | 'error';

export const CryptoCheckoutModal: React.FC<CryptoCheckoutModalProps> = ({
  open,
  onClose,
  tier,
  billingPeriod,
  walletAddress,
  walletBalance,
  requiredAmount,
  onProceed,
  onRefreshBalance,
}) => {
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const hasSufficientBalance = walletBalance >= requiredAmount;
  const shortfall = requiredAmount - walletBalance;

  const handleRefreshBalance = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefreshBalance();
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshBalance]);

  const handleProceed = async () => {
    if (!hasSufficientBalance) {
      setError('Insufficient balance. Please fund your wallet first.');
      return;
    }

    setStatus('processing');
    setError(null);

    try {
      await onProceed();
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openOnramp = () => {
    if (walletAddress) {
      window.open(`https://www.crossmint.com/user/collection?wallet=${walletAddress}`, '_blank');
    }
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStatus('idle');
      setError(null);
    }
  }, [open]);

  // Auto-refresh balance when modal opens
  useEffect(() => {
    if (open && walletAddress) {
      handleRefreshBalance();
    }
  }, [open, walletAddress, handleRefreshBalance]);

  const getPeriodLabel = () => {
    switch (billingPeriod) {
      case 'monthly': return 'month';
      case 'quarterly': return 'quarter';
      case 'annual': return 'year';
      default: return 'period';
    }
  };

  if (status === 'success') {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-background border-border max-w-md">
          <div className="flex flex-col items-center py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <DialogTitle className="text-xl text-foreground mb-2">Payment Successful!</DialogTitle>
            <DialogDescription className="text-muted-foreground mb-6">
              Your {tier.name} subscription is now active. You have access to all {tier.name} features.
            </DialogDescription>
            <Button onClick={onClose} className="w-full">
              Continue to Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-background border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Pay with USDC
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete your {tier.name} subscription payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subscription Summary */}
          <div className="bg-card/80 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="text-foreground font-medium">{tier.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Billing</span>
              <span className="text-foreground capitalize">{billingPeriod}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">Amount Due</span>
              <span className="text-foreground font-bold text-lg">${requiredAmount.toFixed(2)} USDC</span>
            </div>
          </div>

          {/* Wallet Balance */}
          <div className="bg-card/80 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Your Wallet Balance</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshBalance}
                disabled={refreshing}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${hasSufficientBalance ? 'text-green-400' : 'text-yellow-400'}`}>
                ${walletBalance.toFixed(2)}
              </span>
              <span className="text-muted-foreground/70 text-sm">USDC</span>
            </div>

            {!hasSufficientBalance && (
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-yellow-200">
                    You need <span className="font-semibold">${shortfall.toFixed(2)} more</span> USDC to complete this purchase.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Address */}
          {walletAddress && (
            <div className="bg-card/80 rounded-lg p-4">
              <div className="text-sm text-muted-foreground mb-2">Your Wallet Address</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-muted-foreground bg-background px-2 py-1.5 rounded truncate">
                  {walletAddress}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyAddress}
                  className="h-8 px-2"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-red-200 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {hasSufficientBalance ? (
            <Button
              onClick={handleProceed}
              disabled={status === 'processing'}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {status === 'processing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Pay ${requiredAmount.toFixed(2)} USDC
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={openOnramp}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Fund Wallet with Crossmint
            </Button>
          )}

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </div>

        {/* Fee info */}
        <p className="text-xs text-muted-foreground/70 text-center mt-2">
          Pay directly from your embedded Solana wallet with USDC
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoCheckoutModal;
