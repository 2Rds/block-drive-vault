/**
 * Membership Badge Component
 * 
 * Displays the user's current NFT membership status with tier info,
 * expiration, and gas credits.
 */

import React from 'react';
import { 
  Crown, 
  Shield, 
  Star, 
  Zap, 
  Clock, 
  Fuel,
  AlertTriangle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useNFTMembership } from '@/hooks/useNFTMembership';
import { SubscriptionTier, TIER_CONFIGS } from '@/types/nftMembership';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface MembershipBadgeProps {
  variant?: 'compact' | 'full' | 'card';
  showGasCredits?: boolean;
  showStorage?: boolean;
  onUpgrade?: () => void;
}

export function MembershipBadge({
  variant = 'compact',
  showGasCredits = true,
  showStorage = true,
  onUpgrade,
}: MembershipBadgeProps) {
  const { 
    membership, 
    isLoading, 
    formatStorageSize,
    getDisplayInfo 
  } = useNFTMembership();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading membership...</span>
      </div>
    );
  }

  if (!membership) {
    return null;
  }

  const tierConfig = membership.tier ? TIER_CONFIGS[membership.tier] : null;
  const displayInfo = membership.tier ? getDisplayInfo(membership.tier) : null;

  const getTierColor = (tier: SubscriptionTier | null) => {
    switch (tier) {
      case 'basic': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'pro': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'premium': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'enterprise': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTierIcon = (tier: SubscriptionTier | null) => {
    switch (tier) {
      case 'basic': return <Shield className="w-4 h-4" />;
      case 'pro': return <Star className="w-4 h-4" />;
      case 'premium': return <Crown className="w-4 h-4" />;
      case 'enterprise': return <Zap className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  // Compact variant - just a badge
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn("gap-1 cursor-help", getTierColor(membership.tier))}
            >
              {getTierIcon(membership.tier)}
              {tierConfig?.name || 'Free'}
              {membership.nftMint && (
                <span className="text-[10px] opacity-70">NFT</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-medium">{displayInfo?.name || 'BlockDrive Membership'}</p>
              {membership.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  Expires: {format(membership.expiresAt, 'MMM d, yyyy')}
                </p>
              )}
              {membership.nftMint && (
                <p className="text-xs font-mono text-muted-foreground">
                  NFT: {membership.nftMint.slice(0, 12)}...
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full variant - inline with more details
  if (variant === 'full') {
    const storagePercent = tierConfig 
      ? (Number(membership.storageRemaining) / Number(BigInt(tierConfig.storageGB) * BigInt(1024 * 1024 * 1024))) * 100
      : 0;

    return (
      <div className="flex items-center gap-4 flex-wrap">
        <Badge 
          variant="outline" 
          className={cn("gap-1", getTierColor(membership.tier))}
        >
          {getTierIcon(membership.tier)}
          {tierConfig?.name || 'Free'} Membership
        </Badge>

        {membership.expiresAt && membership.daysRemaining >= 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            {membership.daysRemaining} days left
          </div>
        )}

        {showStorage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{formatStorageSize(membership.storageRemaining)} remaining</span>
          </div>
        )}

        {showGasCredits && membership.gasCreditsRemaining > 0 && (
          <div className="flex items-center gap-1 text-sm text-green-400">
            <Fuel className="w-3 h-3" />
            ${(Number(membership.gasCreditsRemaining) / 1_000_000).toFixed(2)} credits
          </div>
        )}

        {membership.nftMint && (
          <a 
            href={`https://explorer.solana.com/address/${membership.nftMint}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            View NFT
          </a>
        )}
      </div>
    );
  }

  // Card variant - full details
  const storageUsedPercent = tierConfig 
    ? 100 - (Number(membership.storageRemaining) / Number(BigInt(tierConfig.storageGB) * BigInt(1024 * 1024 * 1024))) * 100
    : 0;

  return (
    <Card className={cn(
      "border-2",
      membership.tier === 'enterprise' && "border-amber-500/50",
      membership.tier === 'premium' && "border-purple-500/50",
      membership.tier === 'pro' && "border-blue-500/50",
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              getTierColor(membership.tier)
            )}>
              {getTierIcon(membership.tier)}
            </div>
            <div>
              <CardTitle className="text-lg">
                {displayInfo?.name || 'BlockDrive Membership'}
              </CardTitle>
              <CardDescription>
                {membership.nftMint ? 'NFT-based subscription' : 'Free tier'}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getTierColor(membership.tier))}
          >
            {displayInfo?.icon} {tierConfig?.name || 'Free'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expiration */}
        {membership.expiresAt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Expires
            </span>
            <span className={cn(
              membership.daysRemaining <= 7 && "text-amber-400",
              membership.daysRemaining <= 0 && "text-destructive"
            )}>
              {format(membership.expiresAt, 'MMM d, yyyy')}
              {membership.daysRemaining > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({membership.daysRemaining} days)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Storage Usage */}
        {showStorage && tierConfig && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage</span>
              <span>
                {formatStorageSize(membership.storageRemaining)} / {tierConfig.storageGB} GB
              </span>
            </div>
            <Progress value={storageUsedPercent} className="h-2" />
          </div>
        )}

        {/* Gas Credits */}
        {showGasCredits && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Fuel className="w-4 h-4" />
              Gas Credits
            </span>
            <span className="text-green-400 font-medium">
              ${(Number(membership.gasCreditsRemaining) / 1_000_000).toFixed(2)} USDC
            </span>
          </div>
        )}

        {/* NFT Info */}
        {membership.nftMint && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">NFT Mint</span>
              <a 
                href={`https://explorer.solana.com/address/${membership.nftMint}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline font-mono"
              >
                {membership.nftMint.slice(0, 8)}...{membership.nftMint.slice(-4)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Expiration Warning */}
        {membership.daysRemaining <= 7 && membership.daysRemaining > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-400 font-medium">Expiring soon</p>
              <p className="text-muted-foreground text-xs">
                Renew to keep your files accessible
              </p>
            </div>
          </div>
        )}

        {/* Upgrade Button */}
        {onUpgrade && membership.tier !== 'enterprise' && (
          <Button 
            onClick={onUpgrade} 
            variant="outline" 
            className="w-full"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
