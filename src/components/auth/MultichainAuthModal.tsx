import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { useMultichainAuth } from '@/hooks/useMultichainAuth';

interface MultichainAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (jwt: string) => void;
}

export const MultichainAuthModal = ({ open, onOpenChange, onSuccess }: MultichainAuthModalProps) => {
  const [label, setLabel] = useState('');
  const [step, setStep] = useState<'input' | 'challenge' | 'signing' | 'success'>('input');
  
  const {
    isAuthenticating,
    challenge,
    authToken,
    connectedWallets,
    startAuth,
    signChallenge,
    clearAuth
  } = useMultichainAuth();

  const handleStartAuth = async () => {
    if (!label.trim()) {
      return;
    }

    const success = await startAuth(label.trim());
    if (success) {
      setStep('challenge');
    }
  };

  const handleSignChallenge = async () => {
    setStep('signing');
    const success = await signChallenge();
    if (success && authToken) {
      setStep('success');
      onSuccess?.(authToken);
    } else {
      setStep('challenge');
    }
  };

  const handleClose = () => {
    setStep('input');
    setLabel('');
    clearAuth();
    onOpenChange(false);
  };

  const renderWalletStatus = () => {
    const { solana, evm } = connectedWallets;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="text-sm font-medium">Connected Wallets</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">Solana</span>
            {solana ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {solana.address.slice(0, 6)}...{solana.address.slice(-4)}
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Not Connected
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between p-2 bg-muted rounded">
            <span className="text-sm">Base (EVM)</span>
            {evm && evm.chainId === 8453 ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                {evm.address.slice(0, 6)}...{evm.address.slice(-4)}
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Base Not Connected
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>BlockDrive Multichain Authentication</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {renderWalletStatus()}
          
          {step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">BlockDrive Subdomain</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="subdomain"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Enter your subdomain"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">.blockdrive</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You must own both {label || 'yourname'}.blockdrive.sol and {label || 'yourname'}.blockdrive.base
                </p>
              </div>
              
              <Button 
                onClick={handleStartAuth}
                disabled={!label.trim() || !connectedWallets.solana || !connectedWallets.evm || isAuthenticating}
                className="w-full"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Authentication...
                  </>
                ) : (
                  'Start Multichain Authentication'
                )}
              </Button>
            </div>
          )}

          {step === 'challenge' && challenge && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Authentication Challenge</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Label:</strong> {challenge.label}</p>
                  <p><strong>Solana:</strong> {challenge.sol_pubkey.slice(0, 20)}...</p>
                  <p><strong>Base:</strong> {challenge.evm_addr.slice(0, 20)}...</p>
                  <p><strong>Nonce:</strong> {challenge.nonce.slice(0, 8)}...</p>
                </div>
              </div>
              
              <Button onClick={handleSignChallenge} className="w-full">
                Sign with Both Wallets
              </Button>
            </div>
          )}

          {step === 'signing' && (
            <div className="space-y-4 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p>Signing challenge and verifying ownership...</p>
              <p className="text-sm text-muted-foreground">
                Please confirm signatures in both wallet extensions
              </p>
            </div>
          )}

          {step === 'success' && authToken && (
            <div className="space-y-4 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <div>
                <h4 className="font-medium text-green-700">Authentication Successful!</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You have been authenticated with both chains
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                JWT Token Issued (15min TTL)
              </Badge>
              <Button onClick={handleClose} className="w-full">
                Continue to Dashboard
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};