import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface MVPConnectButtonProps {
  variant?: 'default' | 'hero';
}

export const MVPConnectButton: React.FC<MVPConnectButtonProps> = ({ 
  variant = 'default' 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { connectWallet, user } = useAuth();
  const navigate = useNavigate();

  const handleConnect = async () => {
    if (user) {
      // Already authenticated, go to dashboard
      navigate('/dashboard');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Generate a demo wallet address for MVP
      const demoWalletAddress = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      
      // Create MVP user authentication
      await connectWallet({
        address: demoWalletAddress,
        blockchain: 'solana',
        isMVP: true
      });
      
      console.log('✅ MVP Quick Access granted');
      navigate('/dashboard');
    } catch (error) {
      console.error('MVP connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (user) {
    return (
      <Button 
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95"
      >
        <span>Go to Dashboard</span>
        <ArrowRight className="w-4 h-4" />
      </Button>
    );
  }

  if (variant === 'hero') {
    return (
      <Button 
        onClick={handleConnect}
        disabled={isConnecting}
        size="lg"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 rounded-xl text-lg font-semibold transition-all duration-200 hover:scale-105 hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] active:scale-95"
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <span>Get Started Free</span>
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </Button>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      disabled={isConnecting}
      className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)] active:scale-95"
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Wallet className="w-4 h-4" />
          <span>Get Started</span>
        </>
      )}
    </Button>
  );
};
