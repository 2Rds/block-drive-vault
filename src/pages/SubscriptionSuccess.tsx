import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, ArrowRight, Wallet, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationList } from '@clerk/clerk-react';

// Team-enabled subscription tiers
const TEAM_TIERS = ['scale', 'growth', 'business', 'enterprise'];

type PaymentProvider = 'stripe' | 'crossmint';

interface SubscriptionDetails {
  tier: string;
  provider: PaymentProvider;
  status: string;
}

function LoadingState(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4">
      <Card className="bg-[#18181b]/90 border-[#27272a] max-w-md w-full backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-[#2dd4bf] animate-spin mx-auto mb-4" />
          <p className="text-[#a1a1aa]">Verifying your subscription...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionSuccess(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { organizationList, isLoaded: orgsLoaded } = useOrganizationList();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProcessed, setHasProcessed] = useState(false);

  const isCrypto = searchParams.get('crypto') === 'true';
  const subscriptionId = searchParams.get('subscription_id');
  const sessionId = searchParams.get('session_id');
  const userId = user?.id;

  // Check if user has a team-enabled tier and no organizations
  const isTeamTier = subscriptionDetails?.tier
    ? TEAM_TIERS.includes(subscriptionDetails.tier.toLowerCase())
    : false;
  const hasNoOrganizations = orgsLoaded && (!organizationList || organizationList.length === 0);
  const shouldForceTeamCreation = isTeamTier && hasNoOrganizations;

  useEffect(() => {
    async function processSubscriptionSuccess() {
      // Guard: only process once per session
      if (!userId || hasProcessed) return;

      setIsLoading(true);

      try {
        if (isCrypto && subscriptionId) {
          const { data: cryptoSub, error: cryptoError } = await supabase
            .from('crypto_subscriptions')
            .select('tier, status, current_period_start, current_period_end')
            .eq('id', subscriptionId)
            .single();

          if (cryptoError) {
            toast.error('Failed to verify subscription. Please contact support.');
          } else if (cryptoSub) {
            setSubscriptionDetails({
              tier: cryptoSub.tier,
              provider: 'crossmint',
              status: cryptoSub.status
            });

            if (cryptoSub.status === 'active') {
              toast.success(`Welcome to ${cryptoSub.tier}! Your crypto subscription is now active.`);
            }
          }
        } else if (sessionId) {
          const { data, error } = await supabase.functions.invoke('verify-subscription', {
            body: { sessionId, userId }
          });

          if (error) {
            toast.error('Failed to verify subscription. Please contact support.');
          } else if (data?.subscribed) {
            setSubscriptionDetails({
              tier: data.subscription_tier,
              provider: 'stripe',
              status: 'active'
            });
            toast.success(`Welcome to ${data.subscription_tier}! Your subscription is now active.`);
          }
        }
        // Mark as processed to prevent re-running
        setHasProcessed(true);
      } catch {
        toast.error('Failed to process subscription. Please contact support.');
      } finally {
        setIsLoading(false);
      }
    }

    processSubscriptionSuccess();
  }, [userId, isCrypto, subscriptionId, sessionId, hasProcessed]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Gradient glow effects */}
      <div className="fixed top-1/3 left-1/3 w-[400px] h-[400px] bg-[#2dd4bf]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/3 right-1/3 w-[300px] h-[300px] bg-[#0d9488]/5 rounded-full blur-[80px] pointer-events-none" />

      <Card className="bg-[#18181b]/90 border-[#27272a] max-w-md w-full backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-[#2dd4bf]/20 to-[#0d9488]/20 border border-[#2dd4bf]/30">
            {isCrypto ? (
              <Wallet className="w-8 h-8 text-[#2dd4bf]" />
            ) : (
              <CheckCircle className="w-8 h-8 text-[#2dd4bf]" />
            )}
          </div>
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            Subscription Activated!
          </CardTitle>
          {subscriptionDetails && (
            <p className="text-sm text-[#a1a1aa] mt-2">
              {subscriptionDetails.tier} Plan • Paid with {isCrypto ? 'USDC' : 'Card'}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 text-center">
          <div className="space-y-2">
            <p className="text-[#e4e4e7]">
              Thank you for subscribing to BlockDrive!
            </p>
            <p className="text-sm text-[#71717a]">
              Your subscription is now active with access to all premium features.
            </p>
          </div>

          {/* Features list */}
          <div className="bg-[#0c0c0c] border border-[#27272a] rounded-xl p-4">
            <h4 className="text-white font-medium mb-3 text-left">What's included:</h4>
            <ul className="text-sm text-[#a1a1aa] space-y-2 text-left">
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" />
                Enhanced storage limits
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" />
                Advanced blockchain features
              </li>
              {isTeamTier && (
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" />
                  Team collaboration tools
                </li>
              )}
              <li className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#2dd4bf] flex-shrink-0" />
                Priority support
              </li>
            </ul>
          </div>

          {isCrypto && (
            <div className="bg-[#0c0c0c] border border-[#27272a] rounded-xl p-4">
              <h4 className="text-white font-medium mb-2 text-sm">Crypto Payment Info</h4>
              <p className="text-xs text-[#71717a] text-left">
                Your subscription is paid with USDC. Ensure sufficient balance for automatic renewals.
              </p>
            </div>
          )}

          {/* Team creation section - forced for team tier users */}
          {shouldForceTeamCreation ? (
            <div className="space-y-4 pt-2">
              <div className="bg-gradient-to-br from-[#2dd4bf]/10 to-[#0d9488]/5 border border-[#2dd4bf]/20 rounded-xl p-5">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-[#2dd4bf]" />
                  <h4 className="text-[#2dd4bf] font-semibold">Set Up Your Team</h4>
                </div>
                <p className="text-sm text-[#a1a1aa] mb-4">
                  Your {subscriptionDetails?.tier} plan includes team collaboration.
                  Create your team workspace to get started.
                </p>
                <Button
                  onClick={() => navigate('/onboarding/create-team')}
                  className="w-full bg-gradient-to-r from-[#2dd4bf] to-[#0d9488] hover:from-[#14b8a6] hover:to-[#0f766e] text-[#0c0c0c] font-semibold shadow-lg shadow-[#2dd4bf]/20"
                  size="lg"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Create Your Team
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-[#2dd4bf] to-[#0d9488] hover:from-[#14b8a6] hover:to-[#0f766e] text-[#0c0c0c] font-semibold shadow-lg shadow-[#2dd4bf]/20"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          <p className="text-xs text-[#52525b] pt-2">
            {isCrypto
              ? 'Payment recorded on Solana blockchain.'
              : 'Email confirmation sent via Stripe.'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionSuccess;
