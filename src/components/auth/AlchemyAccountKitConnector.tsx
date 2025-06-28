
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  useAuthModal, 
  useLogout, 
  useSignerStatus, 
  useUser 
} from "@account-kit/react";
import { Wallet, Loader2, CheckCircle, Sparkles } from 'lucide-react';

interface AlchemyAccountKitConnectorProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const AlchemyAccountKitConnector = ({ onAuthenticationSuccess }: AlchemyAccountKitConnectorProps) => {
  const user = useUser();
  const { openAuthModal } = useAuthModal();
  const signerStatus = useSignerStatus();
  const { logout } = useLogout();

  // Handle authentication success
  React.useEffect(() => {
    if (user && onAuthenticationSuccess) {
      const authData = {
        walletAddress: user.address,
        blockchainType: 'ethereum',
        signature: `alchemy-account-kit-${Date.now()}`,
        sessionToken: `alchemy-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        walletType: 'alchemy-account-kit',
        smartAccount: true,
        user: user
      };
      onAuthenticationSuccess(authData);
    }
  }, [user, onAuthenticationSuccess]);

  if (signerStatus.isInitializing) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <div>
              <p className="text-blue-400 font-medium">Initializing Alchemy Account Kit...</p>
              <p className="text-blue-300 text-sm">Please wait while we set up your smart account</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user) {
    return (
      <Card className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-400 font-medium flex items-center space-x-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Alchemy Smart Account Connected</span>
                </p>
                <p className="text-green-300 text-sm">
                  {user.email || 'Anonymous User'}
                  {user.address && (
                    <span className="ml-2 text-xs bg-green-800/40 px-2 py-1 rounded">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={() => logout()}
              variant="outline"
              size="sm"
              className="text-red-400 border-red-800 hover:bg-red-900/20"
            >
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-purple-400 font-medium">Alchemy Account Kit</p>
              <p className="text-purple-300 text-sm">Smart accounts with embedded wallets and social login</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={openAuthModal}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 px-4 py-3 rounded-lg font-medium"
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect with Alchemy Account Kit
      </Button>

      <div className="text-center">
        <p className="text-gray-400 text-sm mb-2">
          Features of Alchemy Account Kit:
        </p>
        <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
          <span className="bg-purple-800/40 px-2 py-1 rounded">Email Login</span>
          <span className="bg-blue-800/40 px-2 py-1 rounded">Social Authentication</span>
          <span className="bg-green-800/40 px-2 py-1 rounded">Passkeys</span>
          <span className="bg-yellow-800/40 px-2 py-1 rounded">Smart Accounts</span>
          <span className="bg-red-800/40 px-2 py-1 rounded">Gasless Transactions</span>
        </div>
      </div>
    </div>
  );
};
