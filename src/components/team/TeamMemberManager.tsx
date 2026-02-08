import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { UserMinus, Shield, User, Crown, Mail, Calendar, Loader2 } from 'lucide-react';
import type { OrganizationMember } from '@/hooks/useOrganizations';

interface TeamMemberManagerProps {
  members: OrganizationMember[];
  currentUserId: string | null;
  loading: boolean;
  onRemoveMember: (clerkUserId: string) => Promise<void>;
  onUpdateRole: (clerkUserId: string, newRole: 'org:admin' | 'org:member') => Promise<void>;
}

const JOIN_METHOD_LABELS: Record<string, string> = {
  owner: 'Owner',
  direct_invite: 'Invitation',
  email_domain: 'Email Domain',
  invite_code: 'Invite Code',
};

const SKELETON_COUNT = 3;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'org:owner') return 'default';
  if (role === 'org:admin' || role === 'admin') return 'secondary';
  return 'outline';
}

function getRoleIcon(role: string) {
  if (role === 'org:owner') return <Crown className="h-3 w-3" />;
  if (role === 'org:admin' || role === 'admin') return <Shield className="h-3 w-3" />;
  return <User className="h-3 w-3" />;
}

function getRoleLabel(role: string): string {
  if (role === 'org:owner') return 'Owner';
  if (role === 'org:admin' || role === 'admin') return 'Admin';
  return 'Member';
}

export function TeamMemberManager({
  members,
  currentUserId,
  loading,
  onRemoveMember,
  onUpdateRole,
}: TeamMemberManagerProps) {
  const [memberToRemove, setMemberToRemove] = useState<OrganizationMember | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const handleRoleChange = async (member: OrganizationMember, newRole: 'org:admin' | 'org:member') => {
    setUpdatingRole(member.clerkUserId);
    try {
      await onUpdateRole(member.clerkUserId, newRole);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    try {
      await onRemoveMember(memberToRemove.clerkUserId);
      setMemberToRemove(null);
    } finally {
      setRemoving(false);
    }
  };

  const isOwner = (member: OrganizationMember) => member.role === 'org:owner';
  const isSelf = (member: OrganizationMember) => member.clerkUserId === currentUserId;
  const canModify = (member: OrganizationMember) => !isOwner(member) && !isSelf(member);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No team members yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Join Method</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.imageUrl} />
                      <AvatarFallback>
                        {getInitials(member.firstName, member.lastName, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email || 'Unknown'}
                        {isSelf(member) && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </p>
                      {member.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {canModify(member) ? (
                    <Select
                      value={member.role === 'org:admin' || member.role === 'admin' ? 'org:admin' : 'org:member'}
                      onValueChange={(value) => handleRoleChange(member, value as 'org:admin' | 'org:member')}
                      disabled={updatingRole === member.clerkUserId}
                    >
                      <SelectTrigger className="w-[120px]">
                        {updatingRole === member.clerkUserId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org:member">
                          <span className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Member
                          </span>
                        </SelectItem>
                        <SelectItem value="org:admin">
                          <span className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                      {getRoleIcon(member.role)}
                      {getRoleLabel(member.role)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {JOIN_METHOD_LABELS[member.joinMethod || 'direct_invite'] || 'Unknown'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(member.joinedAt)}
                  </span>
                </TableCell>
                <TableCell>
                  {canModify(member) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMemberToRemove(member)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>
                {memberToRemove?.firstName && memberToRemove?.lastName
                  ? `${memberToRemove.firstName} ${memberToRemove.lastName}`
                  : memberToRemove?.email}
              </strong>{' '}
              from the team? They will lose access to all team files and resources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
