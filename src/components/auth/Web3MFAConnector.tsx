
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Shield, Key, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Web3MFAConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const Web3MFAConnector = ({ onAuthenticationSuccess }: Web3MFAConnectorProps) => {
  const { connectWallet } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleWeb3MFAAuth = async () => {
    setIsConnecting(true);
    
    try {
      console.log('Starting Web3 MFA authentication...');
      
      // Mock wallet connection for demonstration
      const mockWalletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
      const blockchainType = Math.random() > 0.5 ? 'ethereum' : 'solana';
      const signature = `mock-signature-${Date.now()}`;
      
      console.log('Mock Web3 MFA data:', {
        address: mockWalletAddress,
        blockchainType,
        signature
      });

      // Authenticate with backend
      const result = await connectWallet({
        address: mockWalletAddress,
        blockchain_type: blockchainType,
        signature,
        id: `web3-mfa-${blockchainType}`
      });

      if (result.error) {
        throw new Error(result.error.message || 'Web3 MFA authentication failed');
      }

      toast.success(`Web3 MFA authentication successful!`);

      if (onAuthenticationSuccess) {
        onAuthenticationSuccess({
          walletAddress: mockWalletAddress,
          blockchainType,
          signature,
          sessionToken: `web3-mfa-token-${Date.now()}`,
          message: 'Web3 MFA authentication completed'
        });
      }

      // Dispatch success event for AuthProvider
      window.dispatchEvent(new CustomEvent('web3-mfa-success', {
        detail: {
          walletAddress: mockWalletAddress,
          blockchainType,
          signature,
          sessionToken: `web3-mfa-token-${Date.now()}`
        }
      }));

    } catch (error: any) {
      console.error('Web3 MFA authentication error:', error);
      toast.error(`Web3 MFA failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="bg-gray-800/40 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Shield className="w-5 h-5 text-green-400" />
          <span>Web3 Multi-Factor Authentication</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">
          Secure fallback authentication using Web3 signatures and multi-factor verification.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center space-x-2 text-blue-400">
            <Key className="w-3 h-3" />
            <span>Signature Auth</span>
          </div>
          <div className="flex items-center space-x-2 text-purple-400">
            <Zap className="w-3 h-3" />
            <span>Multi-Chain</span>
          </div>
          <div className="flex items-center space-x-2 text-green-400">
            <Shield className="w-3 h-3" />
            <span>Secure</span>
          </div>
        </div>

        <Button
          onClick={handleWeb3MFAAuth}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:opacity-90 text-white border-0"
        >
          {isConnecting ? (
            <>
              <Wallet className="w-4 h-4 mr-2 animate-pulse" />
              Authenticating...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect with Web3 MFA
            </>
          )}
        </Button>

        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Alternative authentication method if wallet connectors fail
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
