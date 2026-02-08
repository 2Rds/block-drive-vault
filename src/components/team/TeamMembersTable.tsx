import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamMember } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { Trash2, Crown, Shield, User } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TeamMembersTableProps {
  members: TeamMember[];
  teamId: string;
  isOwner: boolean;
  removeTeamMember: (teamId: string, clerkUserId: string) => Promise<void>;
  updateTeamMemberRole: (teamId: string, clerkUserId: string, newRole: string) => Promise<void>;
}

export const TeamMembersTable = ({ members, teamId, isOwner, removeTeamMember, updateTeamMemberRole }: TeamMembersTableProps) => {
  const { user } = useAuth();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground/70" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Owner</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Admin</Badge>;
      default:
        return <Badge variant="outline">Member</Badge>;
    }
  };

  const handleRemoveMember = async (clerkUserId: string) => {
    await removeTeamMember(teamId, clerkUserId);
  };

  const handleRoleChange = async (clerkUserId: string, newRole: string) => {
    await updateTeamMemberRole(teamId, clerkUserId, newRole);
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No team members yet. Start by inviting some members!
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          {isOwner && <TableHead className="w-32">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getRoleIcon(member.role)}
                <div>
                  <div className="font-medium">
                    {member.user_name || member.user_email || 'Unknown User'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {member.user_email}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              {isOwner && member.role !== 'owner' && member.clerk_user_id !== user?.id ? (
                <Select
                  value={member.role}
                  onValueChange={(value) => handleRoleChange(member.clerk_user_id, value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                getRoleBadge(member.role)
              )}
            </TableCell>
            <TableCell>
              {new Date(member.created_at).toLocaleDateString()}
            </TableCell>
            {isOwner && (
              <TableCell>
                {member.role !== 'owner' && member.clerk_user_id !== user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove this member from the team? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRemoveMember(member.clerk_user_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
