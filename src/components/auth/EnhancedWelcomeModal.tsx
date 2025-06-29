
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WalletInfoCard } from './WalletInfoCard';
import { WelcomeStep } from './WelcomeStep';
import { SubdomainStep } from './SubdomainStep';
import { CustomSubdomainService } from '@/services/customSubdomainService';

interface EnhancedWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  blockchainType: 'ethereum' | 'solana';
  isNewUser?: boolean;
  nftAirdropped?: boolean;
  nftData?: any;
}

export const EnhancedWelcomeModal = ({ 
  isOpen, 
  onClose, 
  walletAddress, 
  blockchainType,
  isNewUser = false,
  nftAirdropped = false,
  nftData = null
}: EnhancedWelcomeModalProps) => {
  const [displayName, setDisplayName] = useState('');
  const [subdomainName, setSubdomainName] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [step, setStep] = useState<'welcome' | 'subdomain'>('welcome');
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);

  // Both chains now require subdomain creation (Factor 2 of 2FA)
  const requiresSubdomain = isNewUser;

  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setIsSubdomainAvailable(null);
      return;
    }

    const available = await CustomSubdomainService.checkSubdomainAvailability(subdomain, blockchainType);
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
      // Both Ethereum and Solana users need subdomain creation for full 2FA
      if (requiresSubdomain && subdomainName) {
        console.log('Creating subdomain:', `${subdomainName}.blockdrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'}`);
        
        const subdomainResult = await CustomSubdomainService.createSubdomain(
          walletAddress,
          blockchainType,
          subdomainName
        );
        
        if (!subdomainResult.success) {
          toast.error(subdomainResult.error || 'Failed to create subdomain');
          setIsCompleting(false);
          return;
        }
        
        // Store the subdomain association
        localStorage.setItem(`${blockchainType}-subdomain`, subdomainResult.subdomain || '');
        localStorage.setItem(`welcome-seen-${walletAddress}`, 'true');
        
        toast.success(`🎉 Setup complete! Your ${subdomainResult.subdomain} is ready!`);
      } else {
        // For existing users, just mark as completed
        localStorage.setItem(`welcome-seen-${walletAddress}`, 'true');
        
        if (isNewUser && nftAirdropped) {
          toast.success('🎉 Welcome to BlockDrive! Your NFT authentication is set up.');
        } else {
          toast.success('Welcome to BlockDrive! Setup complete.');
        }
      }
      
      // Complete setup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
          
          {/* NFT Status Display */}
          {isNewUser && nftAirdropped && nftData && (
            <div className="bg-green-800/20 border border-green-700/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-green-400 text-sm font-medium">
                  BlockDrive {blockchainType.toUpperCase()} NFT Airdropped ✓
                </span>
              </div>
              <p className="text-green-300 text-xs mt-1">
                Authentication NFT: {nftData.nft_token_id?.slice(0, 8)}...
              </p>
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
             step === 'subdomain' ? 'Create Subdomain & Complete Setup' : 
             requiresSubdomain ? `Next: Create BlockDrive.${blockchainType === 'ethereum' ? 'eth' : 'sol'} Subdomain` : 'Complete Setup'}
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
