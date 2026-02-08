import { useLocation, useNavigate } from 'react-router-dom';
import { useOrganization, OrganizationSwitcher } from '@clerk/clerk-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useUserData } from '@/hooks/useUserData';
import { cn } from '@/lib/utils';
import {
  Home,
  Files,
  Puzzle,
  Trash2,
  HardDrive,
  UserCog,
} from 'lucide-react';

// Tiers that support team features
const TEAM_ENABLED_TIERS = ['scale', 'growth', 'business', 'enterprise'];

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Main navigation items - simplified
const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
  { id: 'files', label: 'Files', icon: Files, path: '/files' },
  { id: 'integrations', label: 'Integrations', icon: Puzzle, path: '/integrations' },
  { id: 'account', label: 'Account', icon: UserCog, path: '/account' },
];

// Secondary navigation items
const SECONDARY_NAV_ITEMS: NavItem[] = [
  { id: 'trash', label: 'Trash', icon: Trash2, path: '/files?view=trash' },
];

function NavItemButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const navigate = useNavigate();
  const Icon = item.icon;

  return (
    <button
      onClick={() => navigate(item.path)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 border-l-2 text-sm font-medium transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive
          ? 'border-l-2 border-primary bg-primary/[0.06] text-sidebar-accent-foreground'
          : 'border-transparent text-sidebar-foreground/70'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">{item.label}</span>
    </button>
  );
}

function StorageUsage() {
  const { userStats, loading } = useUserData();

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-2 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded w-24 animate-pulse" />
      </div>
    );
  }

  const usedGB = (userStats?.totalStorage || 0) / (1024 * 1024 * 1024);
  const totalGB = 10; // Default storage limit
  const percentage = Math.min((usedGB / totalGB) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="h-1 w-full bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs font-mono text-foreground-muted">
        {usedGB.toFixed(1)} GB of {totalGB} GB used
      </p>
    </div>
  );
}

export function AppSidebar() {
  const location = useLocation();
  const { organization } = useOrganization();
  const { subscriptionStatus } = useSubscriptionStatus();

  const subscriptionTier = subscriptionStatus?.subscription_tier?.toLowerCase() || 'free';
  const hasTeamTier = TEAM_ENABLED_TIERS.includes(subscriptionTier);

  const isItemActive = (item: NavItem) => {
    // Files page - active when on /files (ignoring query params)
    if (item.id === 'files') {
      return location.pathname === '/files';
    }
    // Trash - active when on /files with view=trash
    if (item.id === 'trash') {
      return location.pathname === '/files' && location.search.includes('view=trash');
    }
    // Exact path match for other items
    return location.pathname === item.path;
  };

  return (
    <aside className="w-sidebar h-screen fixed left-0 top-0 border-r border-sidebar-border flex flex-col z-40 sidebar-gradient">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <span className="text-[15px] font-semibold tracking-wide text-sidebar-foreground">
          BlockDrive
        </span>
      </div>

      {/* Organization Switcher */}
      {hasTeamTier && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <OrganizationSwitcher
            hidePersonal={false}
            afterCreateOrganizationUrl="/dashboard"
            afterLeaveOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger: cn(
                  'w-full px-3 py-2 rounded-lg border border-sidebar-border',
                  'bg-sidebar-accent/50 text-sidebar-foreground',
                  'hover:bg-sidebar-accent transition-colors',
                  'flex items-center justify-between'
                ),
                organizationPreviewMainIdentifier: 'text-sidebar-foreground text-sm font-medium',
                organizationPreviewSecondaryIdentifier: 'text-foreground-muted text-xs',
                organizationSwitcherTriggerIcon: 'text-foreground-muted',
              },
            }}
          />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItemButton
              key={item.id}
              item={item}
              isActive={isItemActive(item)}
            />
          ))}
        </div>

        {/* Secondary navigation */}
        <div className="mt-6 pt-4 border-t border-sidebar-border space-y-1">
          {SECONDARY_NAV_ITEMS.map((item) => (
            <NavItemButton
              key={item.id}
              item={item}
              isActive={isItemActive(item)}
            />
          ))}
        </div>
      </nav>

      {/* Storage Usage */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm font-medium text-sidebar-foreground">Storage</span>
        </div>
        <StorageUsage />
      </div>
    </aside>
  );
}
