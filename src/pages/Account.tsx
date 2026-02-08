import { useState } from 'react';
import { AppShell } from "@/components/layout";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useCrossmintWallet } from "@/hooks/useCrossmintWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink, Wallet } from 'lucide-react';

const STRIPE_PORTAL_URL = 'https://billing.stripe.com/p/login/9B6aEW3a59YdbgXgn42VG00';

type BillingPeriod = 'monthly' | 'quarterly' | 'annual';

const PERIOD_LABELS: Record<BillingPeriod, { label: string; discount?: string }> = {
  monthly: { label: 'Monthly' },
  quarterly: { label: 'Quarterly', discount: 'Save 10%' },
  annual: { label: 'Annual', discount: 'Save 15%' },
};

function BillingTab() {
  const { subscriptionStatus } = useSubscriptionStatus();
  const { walletAddress, isInitialized } = useCrossmintWallet();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  const tier = subscriptionStatus?.subscription_tier || 'No Plan';
  const isSubscribed = subscriptionStatus?.subscribed ?? false;

  const handleOpenPortal = () => {
    window.open(STRIPE_PORTAL_URL, '_blank');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Billing Period
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Choose your preferred billing cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {(Object.keys(PERIOD_LABELS) as BillingPeriod[]).map((period) => {
              const { label, discount } = PERIOD_LABELS[period];
              return (
                <Button
                  key={period}
                  variant={billingPeriod === period ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setBillingPeriod(period)}
                >
                  {label}
                  {discount && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {discount}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border border-border/50 rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Current Plan</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your active subscription details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-foreground">{tier}</p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed
                  ? `Active until ${new Date(subscriptionStatus!.subscription_end!).toLocaleDateString()}`
                  : 'No active subscription'}
              </p>
            </div>
            <Badge
              variant={isSubscribed ? 'default' : 'outline'}
              className={isSubscribed ? 'bg-green-600 hover:bg-green-700' : 'bg-muted'}
            >
              {isSubscribed ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <Button onClick={handleOpenPortal} className="bg-blue-600 hover:bg-blue-700 gap-2">
            <CreditCard className="w-4 h-4" />
            Manage Billing in Stripe
            <ExternalLink className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {isInitialized && walletAddress && (
        <Card className="bg-card border border-border/50 rounded-xl">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Connected Wallet
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Your embedded Solana wallet address for reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block px-3 py-2 bg-muted/50 text-muted-foreground font-mono text-xs rounded border border-border/50 break-all">
              {walletAddress}
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Account(): JSX.Element {
  return (
    <AppShell
      title="Account"
      description="Manage your subscription, billing, and account settings"
    >
      <div className="max-w-4xl">
        <Tabs defaultValue="subscription" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="subscription">
            <SubscriptionManager />
          </TabsContent>

          <TabsContent value="billing">
            <BillingTab />
          </TabsContent>

          <TabsContent value="settings">
            <AdvancedSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default Account;
