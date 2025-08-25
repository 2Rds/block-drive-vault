
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Crown } from 'lucide-react';

const SubscriptionCancel = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/pricing');
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/40 border-gray-700/50 max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <CardTitle className="text-2xl text-white">
            Subscription Cancelled
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-gray-300">
              Your subscription process was cancelled. No charges were made to your account.
            </p>
            <p className="text-sm text-gray-400">
              You can still explore our plans and subscribe whenever you're ready.
            </p>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
            <h4 className="text-yellow-400 font-medium mb-2">Continue with Trial Access</h4>
            <p className="text-sm text-yellow-300">
              You can continue using BlockDrive with trial access while you decide.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleGoBack}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Crown className="w-4 h-4 mr-2" />
              View Pricing Plans
            </Button>
            
            <Button
              onClick={handleGoToDashboard}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            Questions? Contact our support team for assistance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCancel;
