
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WalletInfoCard } from './WalletInfoCard';
import { WelcomeStep } from './WelcomeStep';
import { SubdomainStep } from './SubdomainStep';

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
          <DialogTitle>
            {step === 'subdomain' ? (
              <SubdomainStep
                subdomainName={subdomainName}
                onSubdomainChange={setSubdomainName}
                isSubdomainAvailable={isSubdomainAvailable}
              />
            ) : (
              <WelcomeStep
                displayName={displayName}
                onDisplayNameChange={setDisplayName}
              />
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <WalletInfoCard 
            walletAddress={walletAddress} 
            blockchainType={blockchainType} 
          />
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
