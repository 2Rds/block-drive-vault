
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
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
  const [isCompleting, setIsCompleting] = useState(false);

  const handleContinue = async () => {
    setIsCompleting(true);
    
    try {
      // Here you could save additional user preferences or profile info
      // For now, we'll just simulate a brief setup process
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Welcome to BlockDrive! Setup complete.');
      onClose();
      
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-white text-xl">
            Welcome to BlockDrive Wallet
          </DialogTitle>
          <p className="text-gray-400 text-sm mt-2">
            We need a bit of information to get started
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
        </div>

        <div className="flex flex-col space-y-3 mt-6">
          <Button
            onClick={handleContinue}
            disabled={isCompleting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isCompleting ? 'Setting up...' : 'Continue'}
          </Button>
          
          <Button
            onClick={onClose}
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
