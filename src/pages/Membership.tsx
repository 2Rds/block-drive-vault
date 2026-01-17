/**
 * Membership Page
 * 
 * Dedicated page for NFT membership management including
 * tier details, upgrades, and renewal settings.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useNFTMembership } from '@/hooks/useNFTMembership';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Crown, 
  Zap, 
  Shield, 
  HardDrive, 
  ArrowUp, 
  RefreshCw, 
  Calendar,
  Check,
  X,
  Sparkles,
  Users,
  Headphones,
  Code,
  Palette,
  FileCheck,
  Clock
} from 'lucide-react';
import { SubscriptionTier, TIER_CONFIGS } from '@/types/nftMembership';
import { toast } from 'sonner';

const tierOrder: SubscriptionTier[] = ['trial', 'basic', 'pro', 'premium', 'enterprise'];

const tierColors: Record<SubscriptionTier, string> = {
  trial: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  basic: 'bg-muted text-muted-foreground',
  pro: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  premium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  enterprise: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const tierIcons: Record<SubscriptionTier, React.ReactNode> = {
  trial: <Clock className="h-5 w-5" />,
  basic: <Shield className="h-5 w-5" />,
  pro: <Zap className="h-5 w-5" />,
  premium: <Sparkles className="h-5 w-5" />,
  enterprise: <Crown className="h-5 w-5" />,
};

export default function Membership() {
  const navigate = useNavigate();
  const { 
    membership, 
    isLoading, 
    isPurchasing,
    purchaseMembership,
    renewMembership,
    upgradeMembership,
    getTierConfig,
    formatStorageSize,
    getDisplayInfo
  } = useNFTMembership();

  const [autoRenew, setAutoRenew] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const currentTier = membership?.tier || 'basic';
  const currentConfig = getTierConfig(currentTier);
  const displayInfo = getDisplayInfo(currentTier);

  const handleUpgrade = async (newTier: SubscriptionTier) => {
    if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(currentTier)) {
      toast.error('Cannot downgrade tier');
      return;
    }
    
    const result = await upgradeMembership(newTier);
    if (!result.success) {
      toast.error('Upgrade failed', { description: result.error });
    }
  };

  const handleRenew = async () => {
    const result = await renewMembership(billingPeriod);
    if (!result.success) {
      toast.error('Renewal failed', { description: result.error });
    }
  };

  const handlePurchase = async (tier: SubscriptionTier) => {
    const result = await purchaseMembership(tier, billingPeriod);
    if (!result.success) {
      toast.error('Purchase failed', { description: result.error });
    }
  };

  const getPrice = (tier: SubscriptionTier) => {
    const config = TIER_CONFIGS[tier];
    switch (billingPeriod) {
      case 'monthly': return config.monthlyPrice;
      case 'quarterly': return config.quarterlyPrice;
      case 'annual': return config.annualPrice;
    }
  };

  const storageUsedPercent = membership?.features 
    ? (Number(membership.storageRemaining) / Number(currentConfig.storageGB * 1024 * 1024 * 1024)) * 100
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-pulse text-muted-foreground">Loading membership...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">NFT Membership</h1>
          <p className="text-muted-foreground">
            Manage your BlockDrive subscription powered by SPL tokens on Solana
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="upgrade">Upgrade</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Current Membership Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${tierColors[currentTier]}`}>
                      {tierIcons[currentTier]}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{currentConfig.name} Membership</CardTitle>
                      <CardDescription>{currentConfig.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={membership?.isValid ? 'default' : 'destructive'}>
                    {membership?.isValid ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* NFT Details */}
                {membership?.nftMint && (
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">NFT Token</span>
                    </div>
                    <code className="text-xs text-muted-foreground break-all">
                      {membership.nftMint}
                    </code>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Expiration */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Expires</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {membership?.expiresAt 
                        ? new Date(membership.expiresAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {membership?.daysRemaining || 0} days remaining
                    </p>
                  </div>

                  {/* Storage */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Storage</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {membership?.storageRemaining 
                        ? formatStorageSize(membership.storageRemaining)
                        : `${currentConfig.storageGB} GB`}
                    </p>
                    <Progress value={100 - storageUsedPercent} className="h-1 mt-2" />
                  </div>

                  {/* Gas Credits */}
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Gas Credits</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {membership?.gasCreditsRemaining 
                        ? (Number(membership.gasCreditsRemaining) / 1e6).toFixed(2)
                        : '0.00'} USDC
                    </p>
                    <p className="text-xs text-muted-foreground">For on-chain operations</p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-sm font-medium mb-3">Included Features</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <FeatureItem 
                      icon={<Shield className="h-4 w-4" />}
                      label={`Level ${currentConfig.features.maxSecurityLevel} Security`}
                      enabled={true}
                    />
                    <FeatureItem 
                      icon={<RefreshCw className="h-4 w-4" />}
                      label="Instant Revoke"
                      enabled={currentConfig.features.instantRevoke}
                    />
                    <FeatureItem 
                      icon={<Users className="h-4 w-4" />}
                      label="Team Collaboration"
                      enabled={currentConfig.features.teamCollaboration}
                    />
                    <FeatureItem 
                      icon={<Headphones className="h-4 w-4" />}
                      label="Priority Support"
                      enabled={currentConfig.features.prioritySupport}
                    />
                    <FeatureItem 
                      icon={<Code className="h-4 w-4" />}
                      label="API Access"
                      enabled={currentConfig.features.apiAccess}
                    />
                    <FeatureItem 
                      icon={<Palette className="h-4 w-4" />}
                      label="Custom Branding"
                      enabled={currentConfig.features.customBranding}
                    />
                    <FeatureItem 
                      icon={<FileCheck className="h-4 w-4" />}
                      label="SLA Guarantee"
                      enabled={currentConfig.features.slaGuarantee}
                    />
                    <FeatureItem 
                      icon={<HardDrive className="h-4 w-4" />}
                      label={`${currentConfig.storageGB} GB Storage`}
                      enabled={true}
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <Button 
                    onClick={handleRenew} 
                    disabled={isPurchasing}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Renew Membership
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/pricing')}
                    className="gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    View Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upgrade Tab */}
          <TabsContent value="upgrade" className="space-y-6">
            {/* Billing Period Selector */}
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <Button 
                    variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('monthly')}
                  >
                    Monthly
                  </Button>
                  <Button 
                    variant={billingPeriod === 'quarterly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('quarterly')}
                  >
                    Quarterly
                    <Badge variant="secondary" className="ml-2 text-xs">Save 10%</Badge>
                  </Button>
                  <Button 
                    variant={billingPeriod === 'annual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBillingPeriod('annual')}
                  >
                    Annual
                    <Badge variant="secondary" className="ml-2 text-xs">Save 15%</Badge>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tierOrder.map((tier) => {
                const config = TIER_CONFIGS[tier];
                const isCurrent = tier === currentTier;
                const canUpgrade = tierOrder.indexOf(tier) > tierOrder.indexOf(currentTier);
                const price = getPrice(tier);

                return (
                  <Card 
                    key={tier}
                    className={`border-border/50 bg-card/50 relative ${
                      isCurrent ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Current Plan</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center pb-2">
                      <div className={`mx-auto p-3 rounded-lg w-fit ${tierColors[tier]}`}>
                        {tierIcons[tier]}
                      </div>
                      <CardTitle className="text-lg mt-3">{config.name}</CardTitle>
                      <CardDescription className="text-xs">{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                      <div>
                        <span className="text-3xl font-bold">${price}</span>
                        <span className="text-muted-foreground text-sm">
                          /{billingPeriod === 'monthly' ? 'mo' : billingPeriod === 'quarterly' ? 'qtr' : 'yr'}
                        </span>
                      </div>
                      
                      <ul className="space-y-2 text-sm text-left">
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {config.storageGB} GB Storage
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          Level {config.features.maxSecurityLevel} Security
                        </li>
                        <li className="flex items-center gap-2">
                          {config.features.teamCollaboration 
                            ? <Check className="h-4 w-4 text-green-500" />
                            : <X className="h-4 w-4 text-muted-foreground" />}
                          Team Collaboration
                        </li>
                        <li className="flex items-center gap-2">
                          {config.features.apiAccess 
                            ? <Check className="h-4 w-4 text-green-500" />
                            : <X className="h-4 w-4 text-muted-foreground" />}
                          API Access
                        </li>
                      </ul>

                      <Button 
                        className="w-full"
                        variant={canUpgrade ? 'default' : 'outline'}
                        disabled={isCurrent || !canUpgrade || isPurchasing}
                        onClick={() => canUpgrade ? handleUpgrade(tier) : handlePurchase(tier)}
                      >
                        {isCurrent ? 'Current' : canUpgrade ? 'Upgrade' : 'Downgrade'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Renewal Settings</CardTitle>
                <CardDescription>
                  Configure how your membership renews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Auto-Renew Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-renew">Auto-Renew</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically renew your membership when it expires
                    </p>
                  </div>
                  <Switch
                    id="auto-renew"
                    checked={autoRenew}
                    onCheckedChange={setAutoRenew}
                  />
                </div>

                {/* Billing Period */}
                <div className="space-y-2">
                  <Label>Default Billing Period</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant={billingPeriod === 'monthly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBillingPeriod('monthly')}
                    >
                      Monthly
                    </Button>
                    <Button 
                      variant={billingPeriod === 'quarterly' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBillingPeriod('quarterly')}
                    >
                      Quarterly
                    </Button>
                    <Button 
                      variant={billingPeriod === 'annual' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setBillingPeriod('annual')}
                    >
                      Annual
                    </Button>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Solana Wallet</p>
                        <p className="text-sm text-muted-foreground">
                          Pay with USDC or SOL on Solana
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>

            {/* Gas Credits Card */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle>Gas Credits</CardTitle>
                <CardDescription>
                  Credits for on-chain operations like file registration and sharing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div>
                    <p className="text-2xl font-bold">
                      {membership?.gasCreditsRemaining 
                        ? (Number(membership.gasCreditsRemaining) / 1e6).toFixed(2)
                        : '0.00'} USDC
                    </p>
                    <p className="text-sm text-muted-foreground">Available credits</p>
                  </div>
                  <Button variant="outline">
                    <Zap className="h-4 w-4 mr-2" />
                    Top Up
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Feature Item Component
function FeatureItem({ 
  icon, 
  label, 
  enabled 
}: { 
  icon: React.ReactNode; 
  label: string; 
  enabled: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${
      enabled ? 'bg-green-500/10 text-green-400' : 'bg-muted/30 text-muted-foreground'
    }`}>
      {icon}
      <span className="text-xs">{label}</span>
    </div>
  );
}
