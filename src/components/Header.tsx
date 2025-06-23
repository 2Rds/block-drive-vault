
import React, { useState } from 'react';
import { Search, Bell, User, Wallet, Database, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    const { error } = await signOut();
    
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Successfully signed out');
    }
    setIsLoading(false);
  };

  return (
    <header className="bg-black/20 backdrop-blur-sm border-b border-blue-800/30 sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">BlockDrive</h1>
              <p className="text-xs text-blue-200">Web3 Storage</p>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-300 w-5 h-5" />
            <input
              type="text"
              placeholder="Search your files and folders..."
              className="w-full pl-12 pr-6 py-3 bg-blue-900/20 border border-blue-700/50 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="text-blue-300 hover:text-white hover:bg-blue-800/30 rounded-xl">
            <Bell className="w-5 h-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 text-blue-200 hover:text-white hover:bg-blue-800/30 rounded-xl px-3 py-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="font-medium">{user?.user_metadata?.username || 'User'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-blue-900/90 border border-blue-700/50 shadow-xl rounded-xl" align="end" forceMount>
              <DropdownMenuLabel className="font-normal p-4">
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-semibold text-white">
                    {user?.user_metadata?.username || 'User'}
                  </p>
                  <p className="text-xs text-blue-200">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-blue-700/50" />
              <DropdownMenuItem
                className="text-blue-200 hover:bg-blue-800/50 cursor-pointer p-3 m-1 rounded-lg hover:text-white"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                <LogOut className="mr-3 h-4 w-4" />
                <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl px-4 py-2">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span className="text-blue-300 text-sm font-medium">Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
