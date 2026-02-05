/**
 * @deprecated This page uses the old Supabase-based team system.
 * Teams functionality has been migrated to use Clerk Organizations.
 * Team files are now shown in the Dashboard/IPFSFiles with Team Files/My Files tabs.
 * This file is kept for backward compatibility and should be removed in a future cleanup.
 * Use:
 * - OrganizationSwitcher in Header to switch teams
 * - TeamSettings page for team management (uses OrganizationProfile)
 * - CreateTeamOnboarding for new team creation
 */
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useNavigate } from 'react-router-dom';
import { CreateTeamModal } from '@/components/team/CreateTeamModal';
import { TeamSelector } from '@/components/team/TeamSelector';
import { TeamFileGrid } from '@/components/team/TeamFileGrid';
import { TeamUploadArea } from '@/components/team/TeamUploadArea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, Clock, FolderOpen, Crown, Info, Files, BarChart3, Puzzle, Settings } from 'lucide-react';

const SKELETON_COUNT = 3;

const NAV_BUTTON_STYLES = {
  active: "bg-primary hover:bg-primary/90 text-primary-foreground",
  inactive: "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
} as const;

function LoadingSkeleton(): JSX.Element {
  return (
    <div className="container mx-auto p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <div key={i} className="h-32 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Teams(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    teams,
    currentTeam,
    setCurrentTeam,
    loading,
    createTeam,
  } = useTeams();
  const { subscriptionStatus } = useSubscriptionStatus();

  if (loading) {
    return <LoadingSkeleton />;
  }

  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="text-muted-foreground">
            Collaborate with your team on shared files
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={() => navigate('/dashboard')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
            <BarChart3 className="w-4 h-4 mr-2" />Dashboard
          </Button>
          <Button onClick={() => navigate('/files')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
            <Files className="w-4 h-4 mr-2" />IPFS Files
          </Button>
          <Button onClick={() => navigate('/integrations')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
            <Puzzle className="w-4 h-4 mr-2" />Integrations
          </Button>
          <Button variant="default" className={NAV_BUTTON_STYLES.active}>
            <Users className="w-4 h-4 mr-2" />Teams
          </Button>
          <Button onClick={() => navigate('/account')} variant="outline" className={NAV_BUTTON_STYLES.inactive}>
            <Settings className="w-4 h-4 mr-2" />Account
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <TeamSelector teams={teams} currentTeam={currentTeam} setCurrentTeam={setCurrentTeam} />
          <CreateTeamModal createTeam={createTeam} />
        </div>
      </div>

      {!isSubscribed && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upgrade your subscription to create teams and collaborate with colleagues.
          </AlertDescription>
        </Alert>
      )}

      {isSubscribed && subscriptionTier === 'growth' && (
        <Alert>
          <Crown className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            <strong>Growth Plan:</strong> You can create 1 team with up to 3 members total.
          </AlertDescription>
        </Alert>
      )}

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
            <p className="text-muted-foreground text-center">
              Use the "Create Team" button above to start collaborating with your colleagues
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-all hover:shadow-md ${currentTeam?.id === team.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setCurrentTeam(team)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  <Badge variant="secondary">Team</Badge>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(team.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {currentTeam.name} Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="files" className="w-full">
              <TabsList>
                <TabsTrigger value="files">Team Files</TabsTrigger>
                <TabsTrigger value="upload">Upload Files</TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4">
                <TeamFileGrid selectedTeamId={currentTeam.id} />
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <TeamUploadArea currentTeam={currentTeam} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
