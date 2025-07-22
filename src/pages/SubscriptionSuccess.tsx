
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Crown, ArrowRight, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Process subscription verification when user lands on success page
  useEffect(() => {
    const processSubscriptionSuccess = async () => {
      if (!user) return;
      
      // Get session ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');
      
      if (!sessionId) {
        console.log('No session ID found in URL');
        return;
      }
      
      try {
        console.log('Processing subscription verification for session:', sessionId);
        
        // Call our verify-subscription function to link wallet to email and update records
        const { data, error } = await supabase.functions.invoke('verify-subscription', {
          body: { sessionId, userId: user.id }
        });
        
        if (error) {
          console.error('Error verifying subscription:', error);
          toast.error('Failed to verify subscription. Please contact support.');
        } else {
          console.log('Subscription verified:', data);
          if (data?.subscribed) {
            toast.success(`Welcome to ${data.subscription_tier}! Your subscription is now active.`);
          }
        }
        
      } catch (error) {
        console.error('Failed to process subscription:', error);
        toast.error('Failed to process subscription. Please contact support.');
      }
    };

    processSubscriptionSuccess();
  }, [user]);

  const handleGoToAccount = () => {
    navigate('/account');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/40 border-gray-700/50 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <CardTitle className="text-2xl text-white flex items-center justify-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" />
            Subscription Activated!
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-300">
              Thank you for subscribing to BlockDrive! Your payment has been processed successfully.
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
              <li>• Contact support if you need assistance</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleGoToAccount}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              View Subscription Details
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={handleGoToDashboard}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            You will receive an email confirmation from Stripe shortly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;
