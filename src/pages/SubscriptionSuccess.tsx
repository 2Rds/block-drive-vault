import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, ArrowRight, Home, Wallet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type PaymentProvider = 'stripe' | 'crossmint';

interface SubscriptionDetails {
  tier: string;
  provider: PaymentProvider;
  status: string;
}

function LoadingState(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/40 border-gray-700/50 max-w-md w-full">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Verifying your subscription...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SubscriptionSuccess(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isCrypto = searchParams.get('crypto') === 'true';
  const subscriptionId = searchParams.get('subscription_id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    async function processSubscriptionSuccess() {
      if (!user) return;

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
            body: { sessionId, userId: user.id }
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
      } catch {
        toast.error('Failed to process subscription. Please contact support.');
      } finally {
        setIsLoading(false);
      }
    }

    processSubscriptionSuccess();
  }, [user, isCrypto, subscriptionId, sessionId]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/40 border-gray-700/50 max-w-md w-full">
        <CardHeader className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isCrypto ? 'bg-purple-600/20' : 'bg-green-600/20'
          }`}>
            {isCrypto ? (
              <Wallet className="w-8 h-8 text-purple-400" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-400" />
            )}
          </div>
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            Subscription Activated!
          </CardTitle>
          {subscriptionDetails && (
            <p className="text-sm text-gray-400 mt-2">
              {subscriptionDetails.tier} Plan • Paid with {isCrypto ? 'USDC' : 'Card'}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-300">
              Thank you for subscribing to BlockDrive! Your {isCrypto ? 'crypto ' : ''}payment has been processed successfully.
            </p>
            <p className="text-sm text-gray-400">
              Your subscription is now active and you have access to all premium features.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
            <h4 className="text-green-400 font-medium mb-2">What's Next?</h4>
            <ul className="text-sm text-green-300 space-y-1 text-left">
              <li>• Access your enhanced storage limits</li>
              <li>• Explore advanced blockchain features</li>
              <li>• Manage your subscription in Account settings</li>
              {isCrypto && <li>• Your USDC will be automatically charged for renewals</li>}
              <li>• Contact support if you need assistance</li>
            </ul>
          </div>

          {isCrypto && (
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
              <h4 className="text-purple-400 font-medium mb-2">Crypto Subscription Info</h4>
              <p className="text-sm text-purple-300 text-left">
                Your subscription is paid with USDC from your Crossmint wallet.
                Make sure to keep sufficient USDC balance for automatic renewals.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/account')}
              className={`w-full ${isCrypto ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Crown className="w-4 h-4 mr-2" />
              View Subscription Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            {isCrypto
              ? 'Your payment has been recorded on the Solana blockchain.'
              : 'You will receive an email confirmation from Stripe shortly.'
            }
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionSuccess;
