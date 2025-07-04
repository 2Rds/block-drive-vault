
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { RefreshCw, Settings, Crown, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const SubscriptionManager = () => {
  const { user } = useAuth();
  const { subscriptionStatus, loading, error, refetch } = useSubscriptionStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('Subscription status updated');
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    
    try {
      setManagingSubscription(true);
      console.log('Opening customer portal for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Opening subscription management portal...');
      } else {
        throw new Error('No portal URL received');
      }
      
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error(`Failed to open subscription management: ${error.message}`);
    } finally {
      setManagingSubscription(false);
    }
  };

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
    subscription_tier: null,
    subscription_end: null,
    limits: { storage: 5, bandwidth: 10, seats: 1 }
  };

  // Calculate usage percentages (mock data - you can replace with real usage data)
  const storageUsagePercent = 25;
  const bandwidthUsagePercent = 40;
  const seatsUsedPercent = Math.round((1 / limits.seats) * 100);

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
              </h3>
              <p className="text-sm text-gray-400">
                {subscribed 
                  ? `Active until ${new Date(subscription_end!).toLocaleDateString()}`
                  : 'No active subscription'
                }
              </p>
            </div>
            <Badge 
              variant={subscribed ? "default" : "secondary"}
              className={subscribed ? "bg-green-600 hover:bg-green-700" : "bg-gray-600"}
            >
              {subscribed ? 'Active' : 'Free Trial'}
            </Badge>
          </div>

          {/* Usage Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Storage</span>
                <span className="text-white">{limits.storage} GB</span>
              </div>
              <Progress value={storageUsagePercent} className="h-2" />
              <p className="text-xs text-gray-500">{storageUsagePercent}% used</p>
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
            {subscribed ? (
              <Button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                {managingSubscription ? 'Opening...' : 'Manage Subscription'}
              </Button>
            ) : (
              <Button
                onClick={() => window.location.href = '/pricing'}
                className="bg-green-600 hover:bg-green-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
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

          {/* Subscription Features */}
          {subscribed && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-700/50 rounded-lg">
              <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Active Subscription Benefits
              </h4>
              <ul className="text-sm text-green-300 space-y-1">
                <li>• Enhanced storage capacity</li>
                <li>• Priority customer support</li>
                <li>• Advanced blockchain features</li>
                <li>• Team collaboration tools</li>
                {limits.seats > 1 && <li>• Multi-user access</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
