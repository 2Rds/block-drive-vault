
import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, User, Wallet } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const Header = () => {
  const { user, session, walletData, signOut } = useAuth();

  const handleSignOut = async () => {
    console.log('Sign out clicked');
    
    // Clear all auth state
    localStorage.removeItem('sb-supabase-auth-token');
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    } else {
      toast.success('Signed out successfully');
      // Force redirect to auth page
      window.location.href = '/auth';
    }
  };

  // Get display name from user metadata
  const getDisplayName = () => {
    if (user?.user_metadata?.solana_subdomain) {
      return user.user_metadata.solana_subdomain;
    }
    if (user?.user_metadata?.username) {
      return `${user.user_metadata.username}.blockdrive.sol`;
    }
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (walletData?.wallet_address) {
      return `${walletData.wallet_address.slice(0, 4)}...${walletData.wallet_address.slice(-4)}`;
    }
    return 'Solana User';
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <img 
              src="/lovable-uploads/566ba4bc-c9e0-45e2-89fc-48df825abc4f.png" 
              alt="BlockDrive Logo" 
              className="w-10 h-10 object-contain" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BlockDrive</h1>
            <p className="text-xs text-muted-foreground">Solana-Powered Data Management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* User Info */}
          {(user || walletData) && (
            <div className="flex items-center space-x-3 bg-card/60 px-4 py-2 rounded-lg border border-border">
              {walletData ? (
                <Wallet className="w-4 h-4 text-primary" />
              ) : (
                <User className="w-4 h-4 text-primary" />
              )}
              <div className="text-sm">
                <p className="font-medium text-foreground">{getDisplayName()}</p>
                <p className="text-xs text-muted-foreground">
                  {walletData ? 'Solana Wallet Connected' : 'Solana Account'}
                </p>
              </div>
            </div>
          )}
          
          <ThemeToggle />
          
          {/* Sign Out Button */}
          {(user || session) && (
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
