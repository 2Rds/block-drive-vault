import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { SubscriptionManager } from "@/components/subscription/SubscriptionManager";
import { AdvancedSettings } from "@/components/settings/AdvancedSettings";
import { Button } from '@/components/ui/button';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { BarChart3, Files, Settings, Users, Crown, Puzzle } from 'lucide-react';
import { useFolderNavigation } from "@/hooks/useFolderNavigation";
import { useBoxOAuth } from "@/hooks/useBoxOAuth";

const TEAM_TIERS = ['growth', 'scale'] as const;

const NAV_BUTTON_STYLES = {
  active: "bg-primary hover:bg-primary/90 text-primary-foreground",
  inactive: "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50",
  teams: "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20 hover:border-purple-500/50",
} as const;

function canAccessTeamsFeature(subscriptionStatus: { subscribed?: boolean; subscription_tier?: string } | null): boolean {
  if (!subscriptionStatus?.subscribed) return false;
  const tier = subscriptionStatus.subscription_tier || 'free';
  return TEAM_TIERS.includes(tier as typeof TEAM_TIERS[number]);
}

function Account(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { subscriptionStatus } = useSubscriptionStatus();
  const { openFolders, toggleFolder } = useFolderNavigation();
  useBoxOAuth();
  const [selectedFolder, setSelectedFolder] = useState('all');

  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const canAccessTeams = canAccessTeamsFeature(subscriptionStatus);
  const isOnAccount = location.pathname === '/account';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <div className="flex">
        <Sidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onFolderClick={toggleFolder}
          openFolders={openFolders}
        />
        <main className="flex-1 p-6 ml-64">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Account Management</h1>
                <p className="text-gray-400">Manage your BlockDrive account and subscription</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className={NAV_BUTTON_STYLES.inactive}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  onClick={() => navigate('/files')}
                  variant="outline"
                  className={NAV_BUTTON_STYLES.inactive}
                >
                  <Files className="w-4 h-4 mr-2" />
                  IPFS Files
                </Button>
                <Button
                  onClick={() => navigate('/integrations')}
                  variant="outline"
                  className={NAV_BUTTON_STYLES.inactive}
                >
                  <Puzzle className="w-4 h-4 mr-2" />
                  Integrations
                </Button>
                {canAccessTeams && (
                  <Button
                    onClick={() => navigate('/teams')}
                    variant="outline"
                    className={NAV_BUTTON_STYLES.teams}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Teams
                    {subscriptionTier === 'growth' && (
                      <Crown className="w-3 h-3 ml-1 text-yellow-500" />
                    )}
                  </Button>
                )}
                <Button
                  variant={isOnAccount ? "default" : "outline"}
                  className={isOnAccount ? NAV_BUTTON_STYLES.active : NAV_BUTTON_STYLES.inactive}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Account
                </Button>
              </div>
            </div>

            <SubscriptionManager />
            <AdvancedSettings />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Account;