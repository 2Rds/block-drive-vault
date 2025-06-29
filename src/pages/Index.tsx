
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from 'lucide-react';
import { EnhancedWelcomeModal } from '@/components/auth/EnhancedWelcomeModal';

const Index = () => {
  const { user, session, signOut, walletData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      if (!user || !session) {
        console.log('No session found, redirecting to auth');
        navigate('/auth');
      }
      setLoading(false);
    };

    checkAuth();
  }, [user, session, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const profileDropdown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Enhanced welcome modal logic for new custom flow
  const shouldShowWelcomeModal = useMemo(() => {    
    if (!user?.user_metadata?.wallet_address) return false;
    
    const walletAddress = user.user_metadata.wallet_address;
    const hasSeenWelcome = localStorage.getItem(`welcome-seen-${walletAddress}`);
    
    // Show welcome modal for new users or users who haven't seen it
    return !hasSeenWelcome;
  }, [user]);

  const closeWelcomeModal = () => {
    if (user?.user_metadata?.wallet_address) {
      localStorage.setItem(`welcome-seen-${user.user_metadata.wallet_address}`, 'true');
      setShowWelcomeModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading BlockDrive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Enhanced Welcome Modal */}
      {shouldShowWelcomeModal && user?.user_metadata?.wallet_address && (
        <EnhancedWelcomeModal
          isOpen={showWelcomeModal}
          onClose={closeWelcomeModal}
          walletAddress={user.user_metadata.wallet_address}
          blockchainType={(user.user_metadata.blockchain_type as 'ethereum' | 'solana') || 'ethereum'}
          isNewUser={true}
          nftAirdropped={true}
        />
      )}

      <header className="bg-gray-900 border-b border-gray-800">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <a href="/" className="text-xl font-bold">BlockDrive</a>
          <nav>
            <ul className="flex space-x-6">
              <li><a href="/files" className="hover:text-gray-300">My Files</a></li>
              <li><a href="/settings" className="hover:text-gray-300">Settings</a></li>
            </ul>
          </nav>
          {profileDropdown()}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-semibold mb-4">Dashboard</h1>
        <p className="text-gray-400">Welcome to your BlockDrive account!</p>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-4 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} BlockDrive. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
