
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Upload, Lock } from 'lucide-react';
import { useUploadPermissions } from '@/hooks/useUploadPermissions';

interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SubscriptionGate = ({ children, fallback }: SubscriptionGateProps) => {
  const navigate = useNavigate();
  const { canUpload, loading, needsSignup, needsSubscription } = useUploadPermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-400">Checking permissions...</span>
      </div>
    );
  }

  if (canUpload) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default blocked state UI
  if (needsSignup) {
    return (
      <Card className="bg-gray-800/40 backdrop-blur-md rounded-xl border-2 border-dashed border-gray-600 p-8 text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-yellow-600/20 rounded-full">
              <Lock className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-yellow-300">
            Registration Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 mb-6">
            Please complete your registration to access file upload features and IPFS storage.
          </p>
          <Button
            onClick={() => navigate('/pricing')}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:opacity-90 text-white"
          >
            Complete Registration
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (needsSubscription) {
    return (
      <Card className="bg-gray-800/40 backdrop-blur-md rounded-xl border-2 border-dashed border-red-600 p-8 text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-600/20 rounded-full">
              <CreditCard className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-xl font-semibold text-red-300">
            Subscription Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 mb-6">
            Please choose a subscription plan to access file upload features and IPFS storage.
          </p>
          <div className="flex justify-center space-x-4">
            <Button
              onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-90 text-white"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              View Pricing
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/40 backdrop-blur-md rounded-xl border-2 border-dashed border-gray-600 p-8 text-center">
      <CardContent>
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gray-600/20 rounded-full">
            <Upload className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-300 mb-2">
          Upload Restricted
        </h3>
        <p className="text-gray-500">
          File upload is currently restricted. Please check your subscription status.
        </p>
      </CardContent>
    </Card>
  );
};
