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

// Premium lead-genius dark mode gradient - SAME for ALL tiers
// Deep navy background with bright teal accent and glow effect
// Based on lead-genius design system: hsl(230 12% 10%) background, hsl(166 76% 46%) teal
const PREMIUM_GRADIENT = 'bg-[hsl(230_12%_10%)] border-[hsl(230_10%_18%)] hover:border-[hsl(166_76%_46%)]/30 shadow-[0_0_40px_hsl(166_76%_46%/0.15)]';

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
    'power': 'premium',
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
                <div className="w-8 h-8 bg-gradient-to-br from-[hsl(166_76%_46%)] to-[hsl(166_76%_42%)] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_hsl(166_76%_46%/0.25)]">
                  {displayName[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-[120px]">
                    {displayName}
                  </p>
                  <p className="text-xs text-gray-400">{tierConfig.name}</p>
                </div>
              </div>
              <span className="text-lg">{TIER_ICONS[tier]}</span>
            </div>

            {/* Quick stats */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Storage</span>
                  <span>{storagePercent.toFixed(1)}%</span>
                </div>
                <Progress value={storagePercent} className="h-1" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{daysRemaining} days left</span>
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
              {/* Avatar with teal gradient matching lead-genius aesthetic */}
              <div className="w-16 h-16 bg-gradient-to-br from-[hsl(166_76%_46%)] to-[hsl(166_76%_42%)] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-[0_0_20px_hsl(166_76%_46%/0.3)]">
                {displayName[0].toUpperCase()}
              </div>

              {/* User details */}
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {displayName}
                  {tier === 'premium' && <Crown className="w-5 h-5 text-yellow-400" />}
                  {tier === 'enterprise' && <Sparkles className="w-5 h-5 text-amber-400" />}
                </h3>
                <p className="text-sm text-gray-400">
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
          <div className="flex items-center justify-between p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-400">Membership Status</p>
                <p className="text-base font-medium text-white">
                  {isActive ? `Active until ${formatExpiration(expiresAt)}` : 'Expired'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Days Remaining</p>
              <p className="text-2xl font-bold text-white">{daysRemaining}</p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center">
            {getStatusBadge()}
          </div>

          {/* Usage quotas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Storage usage */}
            <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-400">Storage</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {storagePercent.toFixed(1)}% used
                </span>
              </div>
              <Progress value={storagePercent} className="h-2 mb-2" />
              <p className="text-xs text-gray-500">
                {storageUsedGB} GB of {tierConfig.storageGB} GB used
              </p>
            </div>

            {/* Bandwidth usage */}
            <div className="p-4 bg-gray-800/40 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Bandwidth</span>
                </div>
                <span className="text-sm font-medium text-white">
                  {bandwidthPercent.toFixed(1)}% used
                </span>
              </div>
              <Progress value={bandwidthPercent} className="h-2 mb-2" />
              <p className="text-xs text-gray-500">
                {bandwidthUsedGB} GB of {tierConfig.bandwidthGB} GB used
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/pricing')}
              className="flex-1 bg-gradient-to-r from-[hsl(166_76%_46%)] to-[hsl(166_76%_42%)] hover:from-[hsl(166_76%_48%)] hover:to-[hsl(166_76%_44%)] text-white shadow-[0_0_16px_hsl(166_76%_46%/0.2)] hover:shadow-[0_0_24px_hsl(166_76%_46%/0.3)] transition-all"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Upgrade Plan
            </Button>
            <Button
              onClick={() => navigate('/account')}
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
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
