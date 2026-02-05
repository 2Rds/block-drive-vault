import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mail,
  Clock,
  RefreshCw,
  X,
  UserPlus,
  Loader2,
  Send,
  AlertCircle,
} from 'lucide-react';
import { SendTeamInviteModal } from './SendTeamInviteModal';
import type { PendingInvitation } from '@/hooks/useOrganizations';

interface TeamInvitationManagerProps {
  invitations: PendingInvitation[];
  teamName: string;
  loading: boolean;
  onSendInvitation: (email: string, role: string) => Promise<void>;
  onResendInvitation: (invitationId: string) => Promise<void>;
  onRevokeInvitation: (invitationId: string) => Promise<void>;
}

const SKELETON_COUNT = 2;

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return 'Expiring soon';
}

export function TeamInvitationManager({
  invitations,
  teamName,
  loading,
  onSendInvitation,
  onResendInvitation,
  onRevokeInvitation,
}: TeamInvitationManagerProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const handleResend = async (invitationId: string) => {
    setResending(invitationId);
    try {
      await onResendInvitation(invitationId);
    } finally {
      setResending(null);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    setRevoking(invitationId);
    try {
      await onRevokeInvitation(invitationId);
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-40" />
        </div>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Pending Invitations</h3>
            <p className="text-sm text-muted-foreground">
              {invitations.length === 0
                ? 'No pending invitations'
                : `${invitations.length} pending invitation${invitations.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <Send className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              No pending invitations. Invite team members to get started.
            </p>
            <Button variant="outline" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Send First Invitation
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const expired = isExpired(invitation.expiresAt);
                  return (
                    <TableRow key={invitation.id} className={expired ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invitation.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(invitation.sentAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {expired ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeRemaining(invitation.expiresAt)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(invitation.id)}
                            disabled={resending === invitation.id || revoking === invitation.id}
                            title="Resend invitation"
                          >
                            {resending === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(invitation.id)}
                            disabled={resending === invitation.id || revoking === invitation.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Revoke invitation"
                          >
                            {revoking === invitation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SendTeamInviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSend={onSendInvitation}
        teamName={teamName}
      />
    </>
  );
}
