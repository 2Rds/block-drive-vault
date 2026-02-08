/**
 * @deprecated This hook uses the old Supabase-based team system.
 * Teams functionality has been migrated to use Clerk Organizations.
 * Use Clerk's hooks instead:
 * - useOrganization() - get current organization
 * - useOrganizationList() - list user's organizations
 * - useOrganizationMemberships() - get memberships
 * This file is kept for backward compatibility and should be removed in a future cleanup.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_clerk_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  clerk_user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: string;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export const useTeams = () => {
  const { userId, supabase, isSignedIn } = useClerkAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs to prevent duplicate fetches and infinite loops
  const isFetchingTeams = useRef(false);
  const isFetchingMembers = useRef(false);
  const isFetchingInvitations = useRef(false);
  const lastFetchedTeamId = useRef<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!userId || isFetchingTeams.current) return;

    isFetchingTeams.current = true;
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to fetch teams');
    } finally {
      isFetchingTeams.current = false;
    }
  }, [userId, supabase]);

  const fetchTeamMembers = useCallback(async (teamId: string) => {
    if (isFetchingMembers.current) return;

    isFetchingMembers.current = true;
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles:clerk_user_id(first_name, last_name, email)
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      const membersWithUserInfo = (data || []).map((member: any) => ({
        ...member,
        user_email: member.profiles?.email,
        user_name: member.profiles?.first_name
          ? `${member.profiles.first_name} ${member.profiles.last_name || ''}`.trim()
          : member.profiles?.email
      }));

      setTeamMembers(membersWithUserInfo);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to fetch team members');
    } finally {
      isFetchingMembers.current = false;
    }
  }, [supabase]);

  const fetchTeamInvitations = useCallback(async (teamId: string) => {
    if (isFetchingInvitations.current) return;

    isFetchingInvitations.current = true;
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('team_id', teamId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamInvitations(data || []);
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      toast.error('Failed to fetch team invitations');
    } finally {
      isFetchingInvitations.current = false;
    }
  }, [supabase]);

  const createTeam = useCallback(async (teamData: { name: string; description?: string }) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          description: teamData.description,
          owner_clerk_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Also add the owner as a member
      await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          clerk_user_id: userId,
          role: 'owner',
        });

      await fetchTeams();
      toast.success('Team created successfully');
      return data;
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      return null;
    }
  }, [userId, supabase, fetchTeams]);

  const inviteTeamMember = useCallback(async (teamId: string, email: string, role: string = 'member') => {
    try {
      const { error } = await supabase.functions.invoke('send-team-invitation', {
        body: { email, teamId, role },
      });

      if (error) throw error;

      await fetchTeamInvitations(teamId);
      toast.success('Invitation sent successfully');
    } catch (error) {
      console.error('Error inviting team member:', error);
      toast.error('Failed to send invitation');
    }
  }, [supabase, fetchTeamInvitations]);

  const acceptInvitation = useCallback(async (token: string) => {
    if (!userId) return false;

    try {
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (inviteError) throw inviteError;
      if (!invitation) throw new Error('Invalid or expired invitation');

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          clerk_user_id: userId,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      await fetchTeams();
      toast.success('Invitation accepted successfully');
      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
      return false;
    }
  }, [userId, supabase, fetchTeams]);

  const removeTeamMember = useCallback(async (teamId: string, clerkUserId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('clerk_user_id', clerkUserId);

      if (error) throw error;

      await fetchTeamMembers(teamId);
      toast.success('Team member removed successfully');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  }, [supabase, fetchTeamMembers]);

  const updateTeamMemberRole = useCallback(async (teamId: string, clerkUserId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('clerk_user_id', clerkUserId);

      if (error) throw error;

      await fetchTeamMembers(teamId);
      toast.success('Team member role updated successfully');
    } catch (error) {
      console.error('Error updating team member role:', error);
      toast.error('Failed to update team member role');
    }
  }, [supabase, fetchTeamMembers]);

  // Initial fetch of teams
  useEffect(() => {
    if (isSignedIn && userId) {
      fetchTeams().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isSignedIn, userId, fetchTeams]);

  // Fetch team members and invitations when currentTeam changes
  useEffect(() => {
    if (currentTeam && currentTeam.id !== lastFetchedTeamId.current) {
      lastFetchedTeamId.current = currentTeam.id;
      fetchTeamMembers(currentTeam.id);
      fetchTeamInvitations(currentTeam.id);
    } else if (!currentTeam) {
      lastFetchedTeamId.current = null;
      setTeamMembers([]);
      setTeamInvitations([]);
    }
  }, [currentTeam, fetchTeamMembers, fetchTeamInvitations]);

  return {
    teams,
    currentTeam,
    setCurrentTeam,
    teamMembers,
    teamInvitations,
    loading,
    createTeam,
    inviteTeamMember,
    acceptInvitation,
    removeTeamMember,
    updateTeamMemberRole,
    refetchTeams: fetchTeams,
    refetchTeamMembers: useCallback(() => {
      if (currentTeam) fetchTeamMembers(currentTeam.id);
    }, [currentTeam, fetchTeamMembers]),
    refetchTeamInvitations: useCallback(() => {
      if (currentTeam) fetchTeamInvitations(currentTeam.id);
    }, [currentTeam, fetchTeamInvitations]),
  };
};
