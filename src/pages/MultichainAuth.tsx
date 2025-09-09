import React, { useState } from 'react';
import { useDynamicContext, useUserWallets } from '@dynamic-labs/sdk-react-core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { MultichainAuthModal } from '@/components/auth/MultichainAuthModal';
import { useMultichainAuth } from '@/hooks/useMultichainAuth';

export const MultichainAuth = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { primaryWallet, user } = useDynamicContext();
  const userWallets = useUserWallets();
  const { authToken, checkTokengate } = useMultichainAuth();

  const handleTokengateTest = async () => {
    if (authToken) {
      const result = await checkTokengate();
      console.log('Tokengate check result:', result);
    }
  };

  const renderWalletStatus = () => {
    const solanaWallet = userWallets.find(w => w.chain === 'SOL');
    const evmWallet = userWallets.find(w => w.chain?.startsWith('eip155'));
    const baseWallet = userWallets.find(w => w.chain === 'eip155:8453');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Connected Wallets
          </CardTitle>
          <CardDescription>
            Both Solana and Base (EVM) wallets are required for multichain authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">SOL</span>
              </div>
              <span className="font-medium">Solana</span>
            </div>
            {solanaWallet ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {solanaWallet.address.slice(0, 6)}...{solanaWallet.address.slice(-4)}
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Not Connected
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">BASE</span>
              </div>
              <span className="font-medium">Base</span>
            </div>
            {baseWallet ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {baseWallet.address.slice(0, 6)}...{baseWallet.address.slice(-4)}
              </Badge>
            ) : evmWallet ? (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                EVM Connected (Switch to Base)
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Not Connected
              </Badge>
            )}
          </div>

          {userWallets.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Total wallets connected: {userWallets.length}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              BlockDrive Multichain Authentication
            </h1>
            <p className="text-xl text-muted-foreground">
              Secure dual-chain verification using Dynamic SDK + SNS + Basenames
            </p>
          </div>

          {renderWalletStatus()}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Authentication System
              </CardTitle>
              <CardDescription>
                Verify ownership of both [label].blockdrive.sol and [label].blockdrive.base domains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!authToken ? (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to connect both a Solana wallet and a Base wallet, then own matching 
                      .blockdrive.sol and .blockdrive.base subdomains to authenticate.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={() => setShowAuthModal(true)}
                    disabled={userWallets.length < 2}
                    className="w-full"
                    size="lg"
                  >
                    Start Multichain Authentication
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      ✅ Successfully authenticated with multichain verification!
                      Your JWT token is valid for 15 minutes.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleTokengateTest} variant="outline">
                      Test Tokengate API
                    </Button>
                    <Button onClick={() => setShowAuthModal(true)} variant="outline">
                      Authenticate Again
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Architecture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Authentication Factors</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Ownership of [label].blockdrive.sol (SNS)</li>
                    <li>• Ownership of [label].blockdrive.base (Basenames)</li>
                    <li>• Valid Solana Ed25519 signature</li>
                    <li>• Valid EVM secp256k1 signature</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Technical Stack</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Dynamic SDK (multichain wallets)</li>
                    <li>• Supabase Edge Functions (verification)</li>
                    <li>• SNS SDK (Solana domain resolution)</li>
                    <li>• Basenames API (Base domain resolution)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <MultichainAuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={(jwt) => {
          console.log('Authentication successful with JWT:', jwt);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
};