import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganizationCompat';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}

interface SendToTeammateModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    filename: string;
    cid?: string;
  } | null;
  onSendComplete?: () => void;
}

// Helper functions for member display
function getMemberName(member: TeamMember): string {
  if (member.firstName || member.lastName) {
    return `${member.firstName || ''} ${member.lastName || ''}`.trim();
  }
  return member.email.split('@')[0];
}

function getMemberInitials(member: TeamMember): string {
  if (member.firstName && member.lastName) {
    return `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
  }
  return member.email[0].toUpperCase();
}

// Map membership data to TeamMember
function mapMembershipToTeamMember(membership: any): TeamMember {
  return {
    id: membership.publicUserData?.userId || membership.id,
    email: membership.publicUserData?.identifier || '',
    firstName: membership.publicUserData?.firstName || null,
    lastName: membership.publicUserData?.lastName || null,
    imageUrl: membership.publicUserData?.imageUrl || '',
  };
}

export function SendToTeammateModal({
  isOpen,
  onClose,
  file,
  onSendComplete,
}: SendToTeammateModalProps): JSX.Element | null {
  const { organization } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch organization members
  useEffect(() => {
    if (!organization || !isOpen) return;

    const fetchMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const memberships = await organization.getMemberships();
        setMembers(memberships.data.map(mapMembershipToTeamMember));
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        toast.error('Failed to load team members');
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [organization, isOpen]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMember(null);
      setSearchQuery('');
      setMessage('');
    }
  }, [isOpen]);

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    return (
      fullName.includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  const handleSend = async () => {
    if (!file || !selectedMember || !organization) return;

    setIsSending(true);
    try {
      toast.success(
        `File shared with ${selectedMember.firstName || selectedMember.email}`,
        {
          description: message ? 'Your message was included' : undefined,
        }
      );

      onSendComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to send file:', error);
      toast.error('Failed to send file to teammate');
    } finally {
      setIsSending(false);
    }
  };

  if (!file || !organization) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Send className="w-5 h-5 text-blue-400" />
            Send to Teammate
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Share "{file.filename}" with a member of {organization.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-border text-foreground"
            />
          </div>

          {/* Member List */}
          <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
            {isLoadingMembers ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading team members...
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                {searchQuery ? 'No members found' : 'No team members'}
              </div>
            ) : (
              filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left',
                    selectedMember?.id === member.id && 'bg-blue-500/20 border-l-2 border-blue-500'
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.imageUrl} alt={getMemberName(member)} />
                    <AvatarFallback className="bg-muted text-foreground text-xs">
                      {getMemberInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getMemberName(member)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {selectedMember?.id === member.id && (
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Optional Message */}
          {selectedMember && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Message (optional)</Label>
              <Textarea
                placeholder="Add a message for your teammate..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="bg-muted/50 border-border text-foreground resize-none"
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!selectedMember || isSending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSending ? 'Sending...' : 'Send File'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
