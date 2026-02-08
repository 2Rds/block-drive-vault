
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { RefreshCw, Settings, Crown, CheckCircle, ExternalLink } from 'lucide-react';
import { useUserData } from '@/hooks/useUserData';

const STRIPE_PORTAL_URL = 'https://billing.stripe.com/p/login/9B6aEW3a59YdbgXgn42VG00';
const PORTAL_REFRESH_DELAY_MS = 3000;
const VISIBILITY_REFRESH_DELAY_MS = 2000;
const BYTES_PER_GB = 1024 * 1024 * 1024;
const UNLIMITED_SEATS = 999;
const SCALE_MIN_SEATS = 2;
const DEFAULT_BANDWIDTH_PERCENT = 15;

export function SubscriptionManager(): React.ReactElement {
  const { user } = useAuth();
  const { subscriptionStatus, loading, refetch } = useSubscriptionStatus();
  const { userStats } = useUserData();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Subscription status updated');
  };

  const handleManageSubscription = () => {
    if (!user) return;

    window.open(STRIPE_PORTAL_URL, '_blank');
    toast.success('Opening subscription management portal...');
    setTimeout(handleRefresh, PORTAL_REFRESH_DELAY_MS);
  };

  React.useEffect(() => {
    const handleFocus = () => {
      if (user && document.hasFocus()) {
        handleRefresh();
      }
    };

    const handleVisibilityChange = () => {
      if (user && !document.hidden) {
        setTimeout(handleRefresh, VISIBILITY_REFRESH_DELAY_MS);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  if (loading && !subscriptionStatus) {
    return (
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle case where user has no subscription data at all
  if (!subscriptionStatus) {
    return (
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription Status
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your BlockDrive subscription and billing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-border text-muted-foreground hover:bg-muted/30"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* No Subscription Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                No Active Subscription
              </h3>
              <p className="text-sm text-muted-foreground">
                You don't have an active subscription or trial
              </p>
            </div>
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              No Subscription
            </Badge>
          </div>

          {/* Call to Action */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Get Started with BlockDrive
            </h4>
            <p className="text-sm text-primary/80 mb-3">
              Choose a plan to access file storage, IPFS integration, and blockchain features.
            </p>
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="bg-primary hover:bg-primary/90"
            >
              <Crown className="w-4 h-4 mr-2" />
              View Plans & Start Free Trial
            </Button>
          </div>

          {/* Features Preview */}
          <div className="p-4 bg-muted/20 border border-border/50 rounded-lg">
            <h4 className="text-muted-foreground font-medium mb-2">What you'll get with a subscription:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Up to 1 TB secure cloud storage</li>
              <li>• Programmed Incompleteness file splitting</li>
              <li>• Blockchain authentication & ZK proofs</li>
              <li>• Instant revoke file sharing</li>
              <li>• Team collaboration tools (Scale+)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { subscribed, subscription_tier, subscription_end, limits } = subscriptionStatus;

  const storageUsagePercent = limits.storage > 0
    ? Math.min(Math.round((userStats.totalStorage / (limits.storage * BYTES_PER_GB)) * 100), 100)
    : 0;
  const bandwidthUsagePercent = DEFAULT_BANDWIDTH_PERCENT;
  const isFreeTrial = !subscribed && subscription_tier === 'Free Trial';
  const isUnlimitedSeats = limits.seats === UNLIMITED_SEATS;
  const isScaleTier = subscription_tier?.toLowerCase() === 'scale';

  // For Scale tier, show minimum 2 seats; otherwise show 1
  // Actual team member count is shown on the Teams page
  const displaySeatsUsed = isScaleTier ? SCALE_MIN_SEATS : 1;
  const seatsUsedPercent = isUnlimitedSeats
    ? Math.round((displaySeatsUsed / 10) * 100)
    : Math.round((displaySeatsUsed / limits.seats) * 100);

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription Status
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your BlockDrive subscription and billing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-border text-muted-foreground hover:bg-muted/30"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Subscription Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {subscription_tier || 'No Subscription'}
                {subscribed && <CheckCircle className="w-5 h-5 text-green-500" />}
                {isFreeTrial && <CheckCircle className="w-5 h-5 text-blue-500" />}
              </h3>
              <p className="text-sm text-muted-foreground">
                {subscribed
                  ? `Active until ${new Date(subscription_end!).toLocaleDateString()}`
                  : isFreeTrial
                    ? 'Enjoying full access during your 7-day free trial'
                    : 'No active subscription'
                }
              </p>
            </div>
            <Badge
              variant={subscribed ? "default" : isFreeTrial ? "secondary" : "outline"}
              className={
                subscribed
                  ? "bg-green-600 hover:bg-green-700"
                  : isFreeTrial
                    ? "bg-primary hover:bg-primary/90"
                    : "bg-muted"
              }
            >
              {subscribed ? 'Active' : isFreeTrial ? 'Free Trial' : 'Inactive'}
            </Badge>
          </div>

          {/* Free Trial Benefits Notice */}
          {isFreeTrial && (
            <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Free Trial Benefits
              </h4>
              <p className="text-sm text-primary/80 mb-3">
                You have full access to your selected plan's features during the 7-day trial.
              </p>
              <ul className="text-sm text-primary/80 space-y-1">
                <li>• Storage: {limits.storage} GB</li>
                <li>• Bandwidth: {limits.bandwidth} GB/month</li>
                <li>• {limits.seats > 1 ? `${limits.seats} team seats` : '1 user seat'}</li>
                <li>• Blockchain auth & ZK proofs</li>
              </ul>
            </div>
          )}

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-mono text-foreground">{limits.storage} GB</span>
              </div>
              <Progress value={storageUsagePercent} className="h-2" />
              <p className="text-xs font-mono text-muted-foreground/70">
                {(userStats.totalStorage / (1024 * 1024 * 1024)).toFixed(2)} GB used ({storageUsagePercent}%)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bandwidth</span>
                <span className="font-mono text-foreground">{limits.bandwidth} GB</span>
              </div>
              <Progress value={bandwidthUsagePercent} className="h-2" />
              <p className="text-xs font-mono text-muted-foreground/70">{bandwidthUsagePercent}% used this month</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Team Size</span>
                <span className="font-mono text-foreground">
                  {isUnlimitedSeats ? 'Unlimited' : limits.seats} users
                  {isScaleTier && <span className="text-muted-foreground/70 ml-1">(min {SCALE_MIN_SEATS})</span>}
                </span>
              </div>
              <Progress value={seatsUsedPercent} className="h-2" />
              <p className="text-xs font-mono text-muted-foreground/70">
                {displaySeatsUsed} of {isUnlimitedSeats ? 'unlimited' : limits.seats} seats used
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleManageSubscription}
              className="bg-primary hover:bg-primary/90"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>

            {!subscribed && (
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="bg-primary hover:bg-primary/90"
              >
                <Crown className="w-4 h-4 mr-2" />
                {isFreeTrial ? 'Upgrade to Keep Benefits' : 'Start Free Trial'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => window.location.href = '/pricing'}
              className="border-border text-muted-foreground hover:bg-muted/30"
            >
              View All Plans
            </Button>
          </div>

          {/* Portal Information */}
          <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Subscription Management Portal
            </h4>
            <p className="text-sm text-primary/80 mb-3">
              Use the Stripe Customer Portal to manage your subscription, update payment methods, view invoices, and change your plan.
            </p>
            <ul className="text-sm text-primary/80 space-y-1">
              <li>• Update payment methods and billing information</li>
              <li>• Download invoices and payment history</li>
              <li>• Change or cancel your subscription</li>
              <li>• Preview upcoming charges</li>
            </ul>
          </div>

          {/* Subscription Features */}
          {(subscribed || isFreeTrial) && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h4 className="text-primary font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {subscribed ? 'Active Subscription Benefits' : 'Free Trial Benefits'}
              </h4>
              <ul className="text-sm text-primary/80 space-y-1">
                <li>• Enhanced storage capacity: {limits.storage} GB</li>
                <li>• Bandwidth allowance: {limits.bandwidth} GB/month</li>
                <li>• Team seats: {isUnlimitedSeats ? 'Unlimited' : limits.seats}</li>
                <li>• {subscribed ? 'Priority customer support' : 'Community support'}</li>
                <li>• Advanced blockchain features</li>
                {subscribed && <li>• Team collaboration tools</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
