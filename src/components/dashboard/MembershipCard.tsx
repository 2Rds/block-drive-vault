/**
 * Membership Card Component
 *
 * Clean, premium SaaS membership display (like Spotify Premium).
 * Always visible to all users - NO crypto/wallet terminology.
 * Shows membership tier, status, usage quotas, and expiration.
 *
 * Philosophy: Invisible blockchain - users see membership benefits,
 * not technical implementation details.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useUserData } from '@/hooks/useUserData';
import { useNFTMembership } from '@/hooks/useNFTMembership';
import { TIER_CONFIGS } from '@/types/nftMembership';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Calendar,
  HardDrive,
  Radio,
  TrendingUp,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface MembershipCardProps {
  compact?: boolean;
}

// Premium dark mode card styling - matches dashboard color scheme
// Uses primary blue accent to match the rest of the app
const PREMIUM_GRADIENT = 'bg-card border-border hover:border-primary/30';

// Tier badge colors
const TIER_BADGE_COLORS = {
  trial: 'bg-emerald-600 text-emerald-100',
  basic: 'bg-slate-600 text-slate-100',
  pro: 'bg-blue-600 text-blue-100',
  premium: 'bg-purple-600 text-purple-100',
  enterprise: 'bg-amber-600 text-amber-100',
};

// Tier icons
const TIER_ICONS = {
  trial: '✨',
  basic: '🛡️',
  pro: '⭐',
  premium: '👑',
  enterprise: '⚡',
};

// Map subscription tier names (from backend) to frontend tier keys
// Backend stores display names like "Pro", "Power", "Scale"
// Frontend TIER_CONFIGS uses internal keys like "pro", "premium", "enterprise"
function normalizeTierKey(tier: string | null | undefined): keyof typeof TIER_CONFIGS {
  if (!tier) return 'basic';

  const normalizedTier = tier.toLowerCase();

  // Direct matches (pro, trial, basic, premium, enterprise)
  if (normalizedTier in TIER_CONFIGS) {
    return normalizedTier as keyof typeof TIER_CONFIGS;
  }

  // Map display names to internal keys
  const tierMapping: Record<string, keyof typeof TIER_CONFIGS> = {
    'scale': 'enterprise',
    'power': 'premium', // legacy mapping
    'growth': 'premium',
    'starter': 'basic',
    'free': 'basic',
    'free_trial': 'trial',
    'free trial': 'trial',
  };

  return tierMapping[normalizedTier] || 'basic';
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const { subscriptionStatus, loading: subLoading } = useSubscriptionStatus();
  const { userStats } = useUserData();
  const { membership, isLoading: membershipLoading } = useNFTMembership();
  const navigate = useNavigate();

  // Get display name (Clerk username as placeholder until SNS in Phase 2)
  const displayName = user?.user_metadata?.full_name ||
                      user?.email?.split('@')[0] ||
                      'User';

  // Get tier from subscription or membership (normalize to internal key)
  const tier = normalizeTierKey(subscriptionStatus?.subscription_tier || membership?.tier);
  const tierConfig = TIER_CONFIGS[tier];
  const tierInfo = membership ? membership : null;

  // Calculate storage usage percentage
  const storageLimit = tierConfig.storageGB * 1024 * 1024 * 1024; // Convert GB to bytes
  const storageUsed = userStats.totalStorage;
  const storagePercent = Math.min((storageUsed / storageLimit) * 100, 100);
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2);

  // Bandwidth usage (TODO Phase 2: implement tracking)
  const bandwidthPercent = 5.2; // Placeholder
  const bandwidthUsedGB = (tierConfig.bandwidthGB * bandwidthPercent / 100).toFixed(1);

  // Membership status
  const isActive = tierInfo?.isValid ?? false;
  const daysRemaining = tierInfo?.daysRemaining ?? 0;
  const expiresAt = tierInfo?.expiresAt ? new Date(tierInfo.expiresAt) : null;

  // Format expiration date
  const formatExpiration = (date: Date | null): string => {
    if (!date) return 'No expiration';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Determine status badge
  const getStatusBadge = () => {
    if (tier === 'trial') {
      return (
        <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/50 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Trial Active
        </Badge>
      );
    }

    if (isActive) {
      return (
        <Badge className="bg-green-600/20 text-green-400 border-green-600/50 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Active
        </Badge>
      );
    }

    return (
      <Badge className="bg-red-600/20 text-red-400 border-red-600/50 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Expired
      </Badge>
    );
  };

  // Compact mode for sidebar
  if (compact) {
    return (
      <Card className={`${PREMIUM_GRADIENT} border transition-all hover:scale-[1.02]`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* User name */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {displayName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">{tierConfig.name}</p>
                </div>
              </div>
              <span className="text-lg">{TIER_ICONS[tier]}</span>
            </div>

            {/* Quick stats */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Storage</span>
                  <span>{storagePercent.toFixed(1)}%</span>
                </div>
                <Progress value={storagePercent} className="h-1" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{daysRemaining} days left</span>
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full card mode
  return (
    <Card className={`${PREMIUM_GRADIENT} border transition-all hover:scale-[1.01]`}>
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header: User info and tier badge */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar with blue gradient matching app color scheme */}
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                {displayName[0].toUpperCase()}
              </div>

              {/* User details */}
              <div>
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  {displayName}
                  {tier === 'premium' && <Crown className="w-5 h-5 text-yellow-400" />}
                  {tier === 'enterprise' && <Sparkles className="w-5 h-5 text-amber-400" />}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {/* Placeholder for Phase 2 SNS subdomain */}
                  {displayName.toLowerCase()}.blockdrive.sol
                </p>
              </div>
            </div>

            {/* Tier badge */}
            <Badge className={`${TIER_BADGE_COLORS[tier]} text-base px-4 py-1 flex items-center gap-2`}>
              <span>{TIER_ICONS[tier]}</span>
              {tierConfig.name}
            </Badge>
          </div>

          {/* Membership status */}
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Membership Status</p>
                <p className="text-base font-medium text-foreground">
                  {isActive ? `Active until ${formatExpiration(expiresAt)}` : 'Expired'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Days Remaining</p>
              <p className="text-2xl font-mono font-semibold text-foreground">{daysRemaining}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center">
            {getStatusBadge()}
          </div>

          {/* Usage quotas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Storage usage */}
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Storage</span>
                </div>
                <span className="text-sm font-mono font-medium text-foreground">
                  {storagePercent.toFixed(1)}% used
                </span>
              </div>
              <Progress value={storagePercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground/70">
                {storageUsedGB} GB of {tierConfig.storageGB} GB used
              </p>
            </div>

            {/* Bandwidth usage */}
            <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-muted-foreground">Bandwidth</span>
                </div>
                <span className="text-sm font-mono font-medium text-foreground">
                  {bandwidthPercent.toFixed(1)}% used
                </span>
              </div>
              <Progress value={bandwidthPercent} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground/70">
                {bandwidthUsedGB} GB of {tierConfig.bandwidthGB} GB used
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/pricing')}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button
              onClick={() => navigate('/account')}
              variant="outline"
              className="flex-1 border-border text-muted-foreground hover:bg-muted/30"
            >
              Manage Subscription
            </Button>
          </div>

          {/* Trial notice */}
          {tier === 'trial' && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-700/50 rounded-lg">
              <p className="text-sm text-emerald-300">
                ⚡ Your 7-day trial gives you full access to {tierConfig.name} features.
                Upgrade anytime to continue after trial ends.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembershipCard;
