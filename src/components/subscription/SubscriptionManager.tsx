
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { RefreshCw, Settings, Crown, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUserData } from '@/hooks/useUserData';

export const SubscriptionManager = () => {
  const { user } = useAuth();
  const { subscriptionStatus, loading, error, refetch } = useSubscriptionStatus();
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
    
    try {
      console.log('Opening Stripe customer portal for user:', user.id);
      
      // Open the Stripe customer portal in a new tab
      const portalUrl = 'https://billing.stripe.com/p/login/9B6aEW3a59YdbgXgn42VG00';
      window.open(portalUrl, '_blank');
      
      toast.success('Opening subscription management portal...');
      
      // Refresh subscription status after a delay to catch any changes
      setTimeout(() => {
        handleRefresh();
      }, 3000);
      
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  // Listen for window focus to refresh subscription status when user returns from portal
  React.useEffect(() => {
    const handleFocus = () => {
      if (user && document.hasFocus()) {
        console.log('Window focused, refreshing subscription status');
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  if (loading && !subscriptionStatus) {
    return (
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/3"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !subscriptionStatus) {
    return (
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardContent className="p-6">
          <Alert className="border-red-700 bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              Unable to load subscription data: {error}
            </AlertDescription>
          </Alert>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { subscribed, subscription_tier, subscription_end, limits } = subscriptionStatus || {
    subscribed: false,
    subscription_tier: 'Free Trial',
    subscription_end: null,
    limits: { storage: 50, bandwidth: 50, seats: 1 }
  };

  // Calculate usage percentages based on real data
  const storageUsagePercent = limits.storage > 0 ? Math.min(Math.round((userStats.totalStorage / (limits.storage * 1024 * 1024 * 1024)) * 100), 100) : 0;
  const bandwidthUsagePercent = 15; // This would need to be tracked separately
  const seatsUsedPercent = Math.round((1 / limits.seats) * 100);

  // Determine if this is a free trial
  const isFreeTrial = !subscribed && subscription_tier === 'Free Trial';

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Subscription Status
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your BlockDrive subscription and billing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Subscription Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {subscription_tier || 'Free Trial'}
                {subscribed && <CheckCircle className="w-5 h-5 text-green-500" />}
                {isFreeTrial && <CheckCircle className="w-5 h-5 text-blue-500" />}
              </h3>
              <p className="text-sm text-gray-400">
                {subscribed 
                  ? `Active until ${new Date(subscription_end!).toLocaleDateString()}`
                  : isFreeTrial 
                    ? 'Enjoying Starter tier benefits during free trial'
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
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-gray-600"
              }
            >
              {subscribed ? 'Active' : isFreeTrial ? 'Free Trial' : 'Inactive'}
            </Badge>
          </div>

          {/* Free Trial Benefits Notice */}
          {isFreeTrial && (
            <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Free Trial - Starter Tier Benefits
              </h4>
              <p className="text-sm text-blue-300 mb-3">
                You're currently enjoying Starter tier benefits during your free trial period.
              </p>
              <ul className="text-sm text-blue-300 space-y-1">
                <li>• 50 GB storage capacity</li>
                <li>• 50 GB monthly bandwidth</li>
                <li>• 1 user seat</li>
                <li>• Basic blockchain features</li>
              </ul>
            </div>
          )}

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Storage</span>
                <span className="text-white">{limits.storage} GB</span>
              </div>
              <Progress value={storageUsagePercent} className="h-2" />
              <p className="text-xs text-gray-500">
                {(userStats.totalStorage / (1024 * 1024 * 1024)).toFixed(2)} GB used ({storageUsagePercent}%)
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Bandwidth</span>
                <span className="text-white">{limits.bandwidth} GB</span>
              </div>
              <Progress value={bandwidthUsagePercent} className="h-2" />
              <p className="text-xs text-gray-500">{bandwidthUsagePercent}% used this month</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Team Size</span>
                <span className="text-white">{limits.seats === 999 ? 'Unlimited' : limits.seats} users</span>
              </div>
              <Progress value={seatsUsedPercent} className="h-2" />
              <p className="text-xs text-gray-500">
                1 of {limits.seats === 999 ? 'unlimited' : limits.seats} seats used
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleManageSubscription}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            
            {!subscribed && (
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                {isFreeTrial ? 'Upgrade to Keep Benefits' : 'Start Free Trial'}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/pricing'}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              View All Plans
            </Button>
          </div>

          {/* Portal Information */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
            <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Subscription Management Portal
            </h4>
            <p className="text-sm text-blue-300 mb-3">
              Use the Stripe Customer Portal to manage your subscription, update payment methods, view invoices, and change your plan.
            </p>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Update payment methods and billing information</li>
              <li>• Download invoices and payment history</li>
              <li>• Change or cancel your subscription</li>
              <li>• Preview upcoming charges</li>
            </ul>
          </div>

          {/* Subscription Features */}
          {(subscribed || isFreeTrial) && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
              <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {subscribed ? 'Active Subscription Benefits' : 'Free Trial Benefits (Starter Tier)'}
              </h4>
              <ul className="text-sm text-green-300 space-y-1">
                <li>• Enhanced storage capacity: {limits.storage} GB</li>
                <li>• Bandwidth allowance: {limits.bandwidth} GB/month</li>
                <li>• Team seats: {limits.seats === 999 ? 'Unlimited' : limits.seats}</li>
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
