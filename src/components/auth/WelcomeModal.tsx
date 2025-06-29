
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  blockchainType: string;
}

export const WelcomeModal = ({ isOpen, onClose, walletAddress, blockchainType }: WelcomeModalProps) => {
  const [displayName, setDisplayName] = useState('');
  const [subdomainName, setSubdomainName] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [step, setStep] = useState<'welcome' | 'subdomain'>('welcome');
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);

  const isEthereum = blockchainType === 'ethereum';
  const requiresSubdomain = isEthereum;

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setIsSubdomainAvailable(null);
      return;
    }

    // Simulate availability check - in production this would call your ENS resolver
    const available = !['test', 'admin', 'api', 'www', 'app'].includes(subdomain.toLowerCase());
    setIsSubdomainAvailable(available);
  };

  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (subdomainName) {
        checkSubdomainAvailability(subdomainName);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [subdomainName]);

  const handleContinue = async () => {
    if (step === 'welcome' && requiresSubdomain) {
      setStep('subdomain');
      return;
    }

    setIsCompleting(true);
    
    try {
      // If Ethereum user, create subdomain
      if (requiresSubdomain && subdomainName) {
        console.log('Creating subdomain:', `${subdomainName}.blockdrive.eth`);
        
        // In production, this would call Dynamic's subdomain creation function
        // For now, we'll simulate the process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Store the subdomain association
        localStorage.setItem('ens-subdomain', `${subdomainName}.blockdrive.eth`);
        localStorage.setItem(`welcome-seen-${walletAddress}`, 'true');
        
        toast.success(`ENS subdomain ${subdomainName}.blockdrive.eth created successfully!`);
      } else {
        // For non-Ethereum users, just mark as completed
        localStorage.setItem(`welcome-seen-${walletAddress}`, 'true');
        toast.success('Welcome to BlockDrive! Setup complete.');
      }
      
      // Complete setup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onClose();
      
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleLogout = () => {
    // Clear session and redirect to auth
    localStorage.removeItem('sb-supabase-auth-token');
    window.location.href = '/auth';
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            {step === 'subdomain' ? (
              <Globe className="w-8 h-8 text-white" />
            ) : (
              <CheckCircle className="w-8 h-8 text-white" />
            )}
          </div>
          <DialogTitle className="text-white text-xl">
            {step === 'subdomain' ? 'Create Your ENS Subdomain' : 'Welcome to BlockDrive Wallet'}
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            {step === 'subdomain' 
              ? 'Create your personalized blockdrive.eth subdomain'
              : 'We need a bit of information to get started'
            }
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div className="bg-gray-800/50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Connected Wallet:</span>
              <span className="text-blue-400 font-mono text-sm">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-gray-400 text-sm">Network:</span>
              <span className="text-green-400 text-sm capitalize">{blockchainType}</span>
            </div>
          </div>

          {step === 'welcome' && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-gray-300">
                Display Name (Optional)
              </Label>
              <Input
                id="displayName"
                placeholder="Enter your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          )}

          {step === 'subdomain' && (
            <div className="space-y-4">
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                <h4 className="text-blue-300 font-medium mb-2">ENS Subdomain Required</h4>
                <p className="text-blue-200 text-sm">
                  Ethereum users need to create a blockdrive.eth subdomain to complete their setup and access all features.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subdomainName" className="text-gray-300">
                  Choose Your Subdomain
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="subdomainName"
                    placeholder="Enter subdomain name"
                    value={subdomainName}
                    onChange={(e) => setSubdomainName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                  />
                  <div className="flex items-center">
                    {isSubdomainAvailable === true && (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    )}
                    {isSubdomainAvailable === false && (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Will create: {subdomainName || '[name]'}.blockdrive.eth
                </p>
                {isSubdomainAvailable === false && (
                  <p className="text-xs text-red-400">
                    This subdomain is not available. Please choose another.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3 mt-6">
          <Button
            onClick={handleContinue}
            disabled={isCompleting || (step === 'subdomain' && (!subdomainName || isSubdomainAvailable !== true))}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCompleting ? 'Setting up...' : 
             step === 'subdomain' ? 'Create Subdomain & Continue' : 
             requiresSubdomain ? 'Next: Create Subdomain' : 'Continue'}
          </Button>
          
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white"
          >
            Log out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
