import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TeamMemberManager,
  TeamInvitationManager,
  TeamEmailDomainManager,
} from '@/components/team';
import {
  Users,
  UserPlus,
  Globe,
  ArrowLeft,
  Building2,
  Shield,
} from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  business: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

function TeamAdminHeader({
  teamName,
  tier,
  membersCount,
  loading
}: {
  teamName: string;
  tier?: string;
  membersCount: number;
  loading: boolean;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{teamName}</h1>
              {tier && (
                <Badge className={TIER_COLORS[tier] || ''}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {membersCount} member{membersCount !== 1 ? 's' : ''} · Team Administration
            </p>
          </div>
        </div>
      </div>
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" />
        Admin Access
      </Badge>
    </div>
  );
}

function AccessDenied() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access Team Admin. Only team administrators can
          manage members and settings.
        </p>
        <Button onClick={() => navigate('/teams')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teams
        </Button>
      </div>
    </div>
  );
}

function NoTeamSelected() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md px-4">
        <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h1 className="text-2xl font-bold mb-2">No Team Selected</h1>
        <p className="text-muted-foreground mb-6">
          Please select a team to manage its settings and members.
        </p>
        <Button onClick={() => navigate('/teams')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go to Teams
        </Button>
      </div>
    </div>
  );
}

export default function TeamAdmin(): JSX.Element {
  const navigate = useNavigate();
  const { userId } = useClerkAuth();
  const {
    currentOrganization,
    members,
    pendingInvitations,
    emailDomains,
    loading,
    canManageOrganization,
    removeMember,
    updateMemberRole,
    sendTeamInvitation,
    revokeInvitation,
    resendInvitation,
    addEmailDomain,
  } = useOrganizations();

  // Redirect if not admin after loading
  useEffect(() => {
    if (!loading && currentOrganization && !canManageOrganization) {
      navigate('/teams');
    }
  }, [loading, currentOrganization, canManageOrganization, navigate]);

  // Show loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <TeamAdminHeader
          teamName=""
          membersCount={0}
          loading={true}
        />
        <Skeleton className="h-10 w-full max-w-md mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // No team selected
  if (!currentOrganization) {
    return <NoTeamSelected />;
  }

  // Access denied for non-admins
  if (!canManageOrganization) {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <TeamAdminHeader
        teamName={currentOrganization.name}
        tier={currentOrganization.subscriptionTier}
        membersCount={currentOrganization.membersCount}
        loading={false}
      />

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invitations</span>
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="domains" className="gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Domains</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Team Members</h2>
            <p className="text-sm text-muted-foreground">
              Manage your team members, change roles, or remove access.
            </p>
          </div>
          <TeamMemberManager
            members={members}
            currentUserId={userId}
            loading={loading}
            onRemoveMember={removeMember}
            onUpdateRole={updateMemberRole}
          />
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <TeamInvitationManager
            invitations={pendingInvitations}
            teamName={currentOrganization.name}
            loading={loading}
            onSendInvitation={sendTeamInvitation}
            onResendInvitation={resendInvitation}
            onRevokeInvitation={revokeInvitation}
          />
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <TeamEmailDomainManager
            domains={emailDomains}
            teamName={currentOrganization.name}
            loading={loading}
            onAddDomain={addEmailDomain}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
