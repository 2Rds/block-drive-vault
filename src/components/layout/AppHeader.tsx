import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { Search, Bell, User, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Get display name with fallbacks
function getDisplayName(user: any): string {
  if (!user) return 'User';
  const metadata = user.user_metadata;
  if (metadata?.username) return metadata.username;
  if (metadata?.first_name) return metadata.first_name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

export function AppHeader() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization, membership } = useOrganization();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const displayName = getDisplayName(user);
  const canManageOrganization = membership?.role === 'org:admin' || membership?.role === 'org:owner';

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/files?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

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
    <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border/40 fixed top-0 left-sidebar right-0 z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files and folders..."
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg text-sm',
                'bg-card/50 border border-border/40',
                'text-foreground placeholder:text-foreground-muted',
                'focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary',
                'transition-colors'
              )}
            />
          </div>
        </form>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground-muted hover:text-foreground hover:bg-background-secondary rounded-lg"
          >
            <Bell className="w-5 h-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg',
                  'text-foreground hover:bg-background-secondary'
                )}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 bg-card border border-border/50 shadow-xl rounded-lg"
              align="end"
            >
              <DropdownMenuLabel className="px-3 py-2">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">
                    {displayName}
                  </span>
                  <span className="text-xs text-foreground-muted">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />

              {/* Team Settings - only when in org and user is admin */}
              {organization && canManageOrganization && (
                <DropdownMenuItem
                  className="px-3 py-2 cursor-pointer hover:bg-background-secondary"
                  onClick={() => navigate('/team-settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Team Settings</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                className="px-3 py-2 cursor-pointer hover:bg-background-secondary"
                onClick={() => navigate('/account')}
              >
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                className="px-3 py-2 cursor-pointer hover:bg-background-secondary text-destructive"
                onClick={handleSignOut}
                disabled={isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
