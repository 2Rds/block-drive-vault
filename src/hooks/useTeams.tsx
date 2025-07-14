import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  plan_type: string;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
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
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    if (!user) return;

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
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);

      if (error) throw error;
      
      // Fetch user details separately for each member
      const membersWithUserInfo = await Promise.all(
        (data || []).map(async (member) => {
          const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            ...member,
            user_email: userData?.user?.email,
            user_name: userData?.user?.user_metadata?.full_name || userData?.user?.email
          };
        })
      );
      
      setTeamMembers(membersWithUserInfo || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to fetch team members');
    }
  };

  const fetchTeamInvitations = async (teamId: string) => {
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
    }
  };

  const createTeam = async (teamData: { name: string; description?: string; plan_type?: string }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: teamData.name,
          description: teamData.description,
          owner_id: user.id,
          plan_type: teamData.plan_type || 'growth',
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchTeams();
      toast.success('Team created successfully');
      return data;
    } catch (error) {
      console.error('Error creating team:', error);
      toast.error('Failed to create team');
      return null;
    }
  };

  const inviteTeamMember = async (teamId: string, email: string, role: string = 'member') => {
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
  };

  const acceptInvitation = async (token: string) => {
    if (!user) return false;

    try {
      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .single();

      if (inviteError) throw inviteError;
      if (!invitation) throw new Error('Invalid or expired invitation');

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
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
  };

  const removeTeamMember = async (teamId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      
      await fetchTeamMembers(teamId);
      toast.success('Team member removed successfully');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  const updateTeamMemberRole = async (teamId: string, userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      
      await fetchTeamMembers(teamId);
      toast.success('Team member role updated successfully');
    } catch (error) {
      console.error('Error updating team member role:', error);
      toast.error('Failed to update team member role');
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeams().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (currentTeam) {
      fetchTeamMembers(currentTeam.id);
      fetchTeamInvitations(currentTeam.id);
    }
  }, [currentTeam]);

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
    refetchTeamMembers: () => currentTeam && fetchTeamMembers(currentTeam.id),
    refetchTeamInvitations: () => currentTeam && fetchTeamInvitations(currentTeam.id),
  };
};