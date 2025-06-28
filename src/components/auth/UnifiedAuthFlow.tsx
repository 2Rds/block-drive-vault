
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Shield, Zap, Lock } from 'lucide-react';
import { 
  useAuthModal, 
  useLogout, 
  useSignerStatus, 
  useUser 
} from "@account-kit/react";

interface UnifiedAuthFlowProps {
  onAuthenticationSuccess?: (authData: any) => void;
}

export const UnifiedAuthFlow = ({ onAuthenticationSuccess }: UnifiedAuthFlowProps) => {
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
        walletType: 'alchemy-account-kit-unified',
        smartAccount: true,
        user: user
      };
      onAuthenticationSuccess(authData);
    }
  }, [user, onAuthenticationSuccess]);

  if (signerStatus.isInitializing) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-800/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center animate-pulse">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Setting up your wallet</h3>
                <p className="text-purple-300 text-sm">Please wait while we initialize your secure smart account...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-800/50 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Welcome to BlockDrive!</h3>
                <p className="text-green-300 text-sm mb-4">
                  {user.email || 'Smart Account User'}
                </p>
                {user.address && (
                  <p className="text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-full">
                    {user.address.slice(0, 6)}...{user.address.slice(-4)}
                  </p>
                )}
              </div>
              <button
                onClick={() => logout()}
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                Sign out
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Main Authentication Card */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Sign in to BlockDrive</h2>
            <p className="text-slate-300 text-sm">
              Your secure Web3 storage platform with smart wallet technology
            </p>
          </div>

          <button
            onClick={openAuthModal}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
          >
            <div className="flex items-center justify-center space-x-2">
              <Zap className="w-5 h-5" />
              <span>Continue with Smart Wallet</span>
            </div>
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Powered by Alchemy Account Kit • Secure • Gasless • Easy
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-900/40 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Secure</p>
                <p className="text-slate-400 text-xs">Smart contract security</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Gasless</p>
                <p className="text-slate-400 text-xs">No transaction fees</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login Methods Info */}
      <Card className="bg-slate-900/20 border-slate-700/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <h3 className="text-white font-medium mb-3">Multiple sign-in options available:</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Email & Password</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Google Social Login</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Passkey Authentication</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>External Wallets (MetaMask, etc.)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
