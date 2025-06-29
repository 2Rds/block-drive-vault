import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Wallet, Globe, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Web3AuthService } from '@/services/web3AuthService';
import { toast } from 'sonner';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const { primaryWallet, user } = useDynamicContext();
  const [authStep, setAuthStep] = useState<'connect' | 'minting' | 'subdomain' | 'authenticating' | 'complete'>('connect');
  const [subdomainName, setSubdomainName] = useState('');
  const [loading, setLoading] = useState(false);
  const [authData, setAuthData] = useState<any>(null);

  const getBlockchainType = (wallet: any): 'ethereum' | 'solana' => {
    return wallet?.chain === 'SOL' ? 'solana' : 'ethereum';
  };

  const handleStartAuthentication = async () => {
    if (!primaryWallet || !user) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = getBlockchainType(primaryWallet);
      
      // Create authentication message
      const message = `Authenticate with BlockDrive Web3 MFA - ${Date.now()}`;
      const signature = await primaryWallet.signMessage(message);

      console.log('Starting Web3 MFA:', { walletAddress, blockchainType });
      setAuthStep('authenticating');

      // Attempt authentication
      const authResult = await Web3AuthService.authenticateUser(
        walletAddress,
        blockchainType,
        signature,
        message
      );

      if (authResult.success && !authResult.requiresSubdomain) {
        // Full authentication successful
        setAuthStep('complete');
        setAuthData(authResult);
        toast.success('Web3 Multi-Factor Authentication successful!');
        
        // Emit Web3 MFA success event
        window.dispatchEvent(new CustomEvent('web3-mfa-success', {
          detail: {
            walletAddress,
            blockchainType,
            sessionToken: authResult.sessionToken,
            authType: 'web3-mfa'
          }
        }));
        
        if (onAuthenticationSuccess) {
          onAuthenticationSuccess({
            walletAddress,
            blockchainType,
            sessionToken: authResult.sessionToken,
            authType: 'web3-mfa'
          });
        }
      } else if (authResult.isFirstTime) {
        // First time user - NFT minted, now need subdomain
        setAuthStep('subdomain');
        toast.success('Welcome! NFT minted successfully. Now create your subdomain.');
      } else if (authResult.requiresSubdomain) {
        // Existing user but missing subdomain
        setAuthStep('subdomain');
        toast.warning('Please create your BlockDrive subdomain to complete authentication.');
      } else {
        // Authentication failed
        toast.error(authResult.error || 'Authentication failed');
        setAuthStep('connect');
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast.error('Authentication failed: ' + error.message);
      setAuthStep('connect');
    } finally {
      setLoading(false);
    }
  };

  const handleSubdomainRegistration = async () => {
    if (!primaryWallet || !subdomainName.trim()) {
      toast.error('Please enter a subdomain name');
      return;
    }

    setLoading(true);
    try {
      const walletAddress = primaryWallet.address;
      const blockchainType = getBlockchainType(primaryWallet);

      const result = await Web3AuthService.registerSubdomain(
        walletAddress,
        blockchainType,
        subdomainName.trim()
      );

      if (result.success) {
        // Now complete the authentication
        const message = `Complete BlockDrive Web3 MFA - ${Date.now()}`;
        const signature = await primaryWallet.signMessage(message);
        
        const authResult = await Web3AuthService.authenticateUser(
          walletAddress,
          blockchainType,
          signature,
          message
        );

        if (authResult.success) {
          setAuthStep('complete');
          setAuthData(authResult);
          toast.success('Web3 Multi-Factor Authentication setup complete!');
          
          const fullSubdomain = `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`;
          
          // Emit Web3 MFA success event
          window.dispatchEvent(new CustomEvent('web3-mfa-success', {
            detail: {
              walletAddress,
              blockchainType,
              sessionToken: authResult.sessionToken,
              subdomain: fullSubdomain,
              authType: 'web3-mfa'
            }
          }));
          
          if (onAuthenticationSuccess) {
            onAuthenticationSuccess({
              walletAddress,
              blockchainType,
              sessionToken: authResult.sessionToken,
              subdomain: fullSubdomain,
              authType: 'web3-mfa'
            });
          }
        }
      } else {
        toast.error(result.error || 'Failed to register subdomain');
      }
    } catch (error: any) {
      console.error('Subdomain registration error:', error);
      toast.error('Failed to register subdomain: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderAuthStep = () => {
    switch (authStep) {
      case 'connect':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Web3 Multi-Factor Authentication
              </h3>
              <p className="text-gray-300 text-sm">
                Secure your account with NFT + Subdomain authentication
              </p>
            </div>
            
            {primaryWallet ? (
              <div className="space-y-4">
                <div className="bg-gray-800/40 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <Wallet className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-green-400 font-medium">Wallet Connected</p>
                      <p className="text-gray-300 text-sm">
                        {primaryWallet.address.slice(0, 6)}...{primaryWallet.address.slice(-4)}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {getBlockchainType(primaryWallet).toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartAuthentication}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Start Web3 MFA
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Connect your wallet using the Dynamic widget above to begin
                </p>
              </div>
            )}
          </div>
        );

      case 'authenticating':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-blue-400 mx-auto animate-spin" />
            <h3 className="text-xl font-semibold text-white">Authenticating...</h3>
            <p className="text-gray-300 text-sm">
              Verifying your NFT and subdomain credentials
            </p>
          </div>
        );

      case 'subdomain':
        const blockchainType = primaryWallet ? getBlockchainType(primaryWallet) : 'ethereum';
        const domainSuffix = blockchainType === 'ethereum' ? 'eth' : 'sol';
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Globe className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Create Your Subdomain
              </h3>
              <p className="text-gray-300 text-sm">
                Complete your Web3 MFA setup by creating your BlockDrive subdomain
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose your subdomain name:
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="yourname"
                    value={subdomainName}
                    onChange={(e) => setSubdomainName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    className="flex-1"
                  />
                  <span className="text-gray-400 text-sm">
                    .blockdrive.{domainSuffix}
                  </span>
                </div>
                {subdomainName && (
                  <p className="text-sm text-gray-400 mt-1">
                    Your subdomain: <span className="text-white">{subdomainName}.blockdrive.{domainSuffix}</span>
                  </p>
                )}
              </div>
              
              <Button
                onClick={handleSubdomainRegistration}
                disabled={loading || !subdomainName.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-2" />
                    Register Subdomain
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h3 className="text-xl font-semibold text-white">Authentication Complete!</h3>
            <p className="text-gray-300 text-sm">
              Your Web3 Multi-Factor Authentication is now active
            </p>
            
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2 text-green-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>NFT Verified</span>
                <span>•</span>
                <Globe className="w-4 h-4" />
                <span>Subdomain Verified</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="bg-gray-900/40 border-gray-800">
      <CardContent className="p-6">
        {renderAuthStep()}
      </CardContent>
    </Card>
  );
};
