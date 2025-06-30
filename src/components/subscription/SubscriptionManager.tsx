
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { RefreshCw, Settings, Crown } from 'lucide-react';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  limits: {
    storage: number;
    bandwidth: number;
    seats: number;
  };
}

export const SubscriptionManager = () => {
  const { user } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;
      
      setSubscriptionData(data);
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkSubscription();
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      window.open(data.url, '_blank');
    } catch (error: any) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open subscription management');
    }
  };

  useEffect(() => {
    checkSubscription();
  }, [user]);

  if (loading) {
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

  if (!subscriptionData) {
    return (
      <Card className="bg-gray-800/40 border-gray-700/50">
        <CardContent className="p-6">
          <p className="text-gray-400">Unable to load subscription data</p>
        </CardContent>
      </Card>
    );
  }

  const { subscribed, subscription_tier, subscription_end, limits } = subscriptionData;

  return (
    <Card className="bg-gray-800/40 border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Subscription Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              Manage your BlockDrive subscription
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {subscription_tier || 'Free Trial'}
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
            className={subscribed ? "bg-green-600" : "bg-gray-600"}
          >
            {subscribed ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Storage</span>
              <span className="text-white">{limits.storage} GB</span>
            </div>
            <Progress value={25} className="h-2" />
            <p className="text-xs text-gray-500">25 GB used</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Bandwidth</span>
              <span className="text-white">{limits.bandwidth} GB</span>
            </div>
            <Progress value={40} className="h-2" />
            <p className="text-xs text-gray-500">40% used this month</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Team Size</span>
              <span className="text-white">{limits.seats} users</span>
            </div>
            <Progress value={10} className="h-2" />
            <p className="text-xs text-gray-500">1 of {limits.seats} seats used</p>
          </div>
        </div>

        <div className="flex gap-3">
          {subscribed ? (
            <Button
              onClick={handleManageSubscription}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Subscription
            </Button>
          ) : (
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="bg-green-600 hover:bg-green-700"
            >
              Upgrade Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
