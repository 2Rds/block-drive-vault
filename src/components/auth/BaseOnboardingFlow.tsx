
import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BaseOnboardingService, OnboardingStatus } from '@/services/baseOnboardingService';
import { BaseSubdomainCreator } from './BaseSubdomainCreator';
import { BaseSoulboundNFTInfo } from './BaseSoulboundNFTInfo';
import { toast } from 'sonner';

interface BaseOnboardingFlowProps {
  walletAddress: string;
  onComplete?: () => void;
}

export const BaseOnboardingFlow = ({ walletAddress, onComplete }: BaseOnboardingFlowProps) => {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = async () => {
    try {
      const onboardingStatus = await BaseOnboardingService.checkOnboardingStatus(walletAddress);
      setStatus(onboardingStatus);
      
      if (onboardingStatus.isComplete && onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      toast.error('Failed to check onboarding status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
  };

  const handleSubdomainCreated = async (subdomain: string) => {
    const result = await BaseOnboardingService.handleSubdomainCreated(walletAddress, subdomain);
    
    if (result.success && result.onboardingComplete) {
      toast.success('🎉 Welcome to BlockDrive! Your Base 2FA is now active.');
      if (onComplete) onComplete();
    }
    
    await checkStatus();
  };

  useEffect(() => {
    if (walletAddress) {
      checkStatus();
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Checking your Base authentication status...</p>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Unable to check onboarding status</p>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (status.isComplete) {
    return (
      <Card className="bg-green-900/20 border-green-700">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Base 2FA Complete!</h3>
          <p className="text-green-300">
            Your Base soulbound NFT and blockdrive.eth subdomain are verified.
            You now have secure 2-factor authentication on Base L2.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gray-800/40 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <span>Base 2FA Setup Progress</span>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing}
            >
              {refreshing ? 'Checking...' : 'Refresh'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3">
              {step.completed ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <p className={`font-medium ${step.completed ? 'text-green-400' : 'text-white'}`}>
                  {step.title}
                </p>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Current Step */}
      {status.nextStep && (
        <div>
          {status.nextStep.id === 'mint-nft' && (
            <BaseSoulboundNFTInfo />
          )}
          
          {status.nextStep.id === 'create-subdomain' && (
            <BaseSubdomainCreator
              walletAddress={walletAddress}
              onSubdomainCreated={handleSubdomainCreated}
            />
          )}
        </div>
      )}

      {/* Instructions */}
      <Card className="bg-blue-900/20 border-blue-700">
        <CardContent className="p-4">
          <h4 className="text-blue-300 font-medium mb-2">Next Steps:</h4>
          {!status.hasNFT && (
            <p className="text-blue-200 text-sm mb-2">
              1. Click "Mint Free Base Soulbound NFT" to get your authentication NFT
            </p>
          )}
          {!status.hasSubdomain && (
            <p className="text-purple-200 text-sm">
              {status.hasNFT ? '1' : '2'}. Create your blockdrive.eth subdomain to complete 2FA setup
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
