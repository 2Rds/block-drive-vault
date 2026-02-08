import { useState } from 'react';
import { Search, Bell, User, Wallet, LogOut, LogIn, Crown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { OrganizationSwitcher, useOrganization } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PricingButton } from '@/components/PricingButton';
import { MembershipBadge } from '@/components/membership/MembershipBadge';

// Tiers that support team/organization features
const TEAM_ENABLED_TIERS = ['scale', 'growth', 'business', 'enterprise'];

// Common dropdown menu item style
const DROPDOWN_ITEM_CLASS = "text-muted-foreground hover:bg-muted cursor-pointer p-3 m-1 rounded-lg hover:text-foreground";

// Organization switcher appearance configuration
const ORG_SWITCHER_APPEARANCE = {
  elements: {
    rootBox: "ml-2",
    organizationSwitcherTrigger:
      "px-3 py-2 rounded-xl border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
    organizationPreviewMainIdentifier: "text-foreground",
    organizationPreviewSecondaryIdentifier: "text-muted-foreground",
    organizationSwitcherTriggerIcon: "text-muted-foreground",
  },
};

// Get display name with fallbacks: username > firstName > email prefix > 'User'
function getDisplayName(user: any): string {
  if (!user) return 'User';
  const metadata = user.user_metadata;
  if (metadata?.username) return metadata.username;
  if (metadata?.first_name) return metadata.first_name;
  if (user.email) return user.email.split('@')[0];
  return 'User';
}

export function Header(): JSX.Element {
  const { user, signOut } = useAuth();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { organization, membership } = useOrganization();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Check if user has a team-enabled subscription tier
  const subscriptionTier = subscriptionStatus?.subscription_tier?.toLowerCase() || 'free';
  const hasTeamTier = TEAM_ENABLED_TIERS.includes(subscriptionTier);

  // Check if user can manage the current organization (admin or owner)
  const canManageOrganization = membership?.role === 'org:admin' || membership?.role === 'org:owner';

  const displayName = getDisplayName(user);

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

  const handleSignInClick = () => {
    navigate('/auth');
  };

  return (
    <header className="bg-card/60 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img src="/lovable-uploads/fc6d6b40-71e3-4c10-9f7f-febcee140cc8.png" alt="BlockDrive Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BlockDrive</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl mx-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input type="text" placeholder="Search your files and folders..." className="w-full pl-12 pr-6 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            // Authenticated user content
            <>
              {/* NFT Membership Badge */}
              <MembershipBadge variant="compact" />

              <PricingButton variant="outline" size="sm" className="text-purple-400 border-purple-400 hover:bg-purple-600 hover:text-white" />

              {/* Organization Switcher - only shown for team-enabled tiers */}
              {hasTeamTier && (
                <OrganizationSwitcher
                  hidePersonal={false}
                  afterCreateOrganizationUrl="/dashboard"
                  afterLeaveOrganizationUrl="/dashboard"
                  afterSelectOrganizationUrl="/dashboard"
                  appearance={ORG_SWITCHER_APPEARANCE}
                />
              )}

              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl">
                <Bell className="w-5 h-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-medium">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-card border border-border shadow-xl rounded-xl z-50" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border" />
                  {/* Team Settings - only shown when in an org and user is admin */}
                  {organization && canManageOrganization && (
                    <DropdownMenuItem
                      className={DROPDOWN_ITEM_CLASS}
                      onClick={() => navigate('/team-settings')}
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      <span>Team Settings</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className={DROPDOWN_ITEM_CLASS}
                    onClick={() => navigate('/membership')}
                  >
                    <Crown className="mr-3 h-4 w-4" />
                    <span>Membership</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={DROPDOWN_ITEM_CLASS}
                    onClick={() => navigate('/account')}
                  >
                    <User className="mr-3 h-4 w-4" />
                    <span>Account</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                  <DropdownMenuItem className={DROPDOWN_ITEM_CLASS} onClick={handleSignOut} disabled={isLoading}>
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center space-x-2 bg-blue-600/20 border border-blue-600/30 rounded-xl px-4 py-2">
                <Wallet className="w-4 h-4 text-blue-600" />
                <span className="text-muted-foreground text-sm font-medium">Connected</span>
              </div>
            </>
          ) : (
            // Unauthenticated user content - Login and Sign Up buttons in top right
            <>
              <PricingButton variant="outline" size="sm" className="text-purple-400 border-purple-400 hover:bg-purple-600 hover:text-white mr-2" />

              <div className="flex items-center space-x-3">
                <Button
                  onClick={handleSignInClick}
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 px-4 py-2 rounded-xl font-medium transition-all duration-200"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  <span>Log In</span>
                </Button>

                <Button
                  onClick={handleSignInClick}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white border-0 px-6 py-2 rounded-xl font-medium transition-all duration-200"
                >
                  <span>Sign Up</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
