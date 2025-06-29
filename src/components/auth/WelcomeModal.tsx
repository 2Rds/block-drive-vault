
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { WalletInfoCard } from './WalletInfoCard';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  blockchainType: string;
}

export const WelcomeModal = ({ isOpen, onClose, walletAddress, blockchainType }: WelcomeModalProps) => {
  const [displayName, setDisplayName] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const handleContinue = async () => {
    setIsCompleting(true);
    
    try {
      // Store display name if provided
      if (displayName.trim()) {
        localStorage.setItem(`display-name-${walletAddress}`, displayName.trim());
      }
      
      // Mark welcome as seen
      localStorage.setItem(`welcome-seen-${walletAddress}`, 'true');
      
      toast.success('Welcome to BlockDrive! Your account is ready.');
      
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
            <div className="flex flex-col items-center space-y-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome to BlockDrive</h2>
                <p className="text-gray-400">Your decentralized storage platform is ready!</p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-sm font-medium text-gray-300">
              Display Name (Optional)
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Enter your display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
            />
          </div>

          <WalletInfoCard 
            walletAddress={walletAddress} 
            blockchainType={blockchainType} 
          />
        </div>

        <div className="flex flex-col space-y-3 mt-6">
          <Button
            onClick={handleContinue}
            disabled={isCompleting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCompleting ? 'Setting up...' : 'Get Started'}
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
