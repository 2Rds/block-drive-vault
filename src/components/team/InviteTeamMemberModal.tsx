import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TeamMember } from '@/hooks/useTeams';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { UserPlus, Crown } from 'lucide-react';
import { toast } from 'sonner';

interface InviteTeamMemberModalProps {
  teamId: string;
  teamMembers: TeamMember[];
  inviteTeamMember: (teamId: string, email: string, role?: string) => Promise<void>;
}

export const InviteTeamMemberModal = ({ teamId, teamMembers, inviteTeamMember }: InviteTeamMemberModalProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const { subscriptionStatus } = useSubscriptionStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Check subscription limits
    const currentMemberCount = teamMembers.filter(m => m.team_id === teamId).length;
    const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
    const isSubscribed = subscriptionStatus?.subscribed || false;

    // Enforce limits based on subscription tier
    if (!isSubscribed || subscriptionTier === 'free') {
      toast.error('Upgrade your subscription to invite team members');
      return;
    }

    if (subscriptionTier === 'growth' && currentMemberCount >= 3) {
      toast.error('Growth plan allows up to 3 team members total. Upgrade to Scale for unlimited members.');
      return;
    }

    setLoading(true);
    try {
      await inviteTeamMember(teamId, email.trim(), role);
      setOpen(false);
      setEmail('');
      setRole('member');
    } finally {
      setLoading(false);
    }
  };

  // Calculate current member count and limits
  const currentMemberCount = teamMembers.filter(m => m.team_id === teamId).length;
  const subscriptionTier = subscriptionStatus?.subscription_tier || 'free';
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const isGrowthPlan = subscriptionTier === 'growth';
  const isAtLimit = isGrowthPlan && currentMemberCount >= 3;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="flex items-center gap-2"
          disabled={!isSubscribed || isAtLimit}
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
          {isGrowthPlan && (
            <Crown className="h-3 w-3 ml-1 text-yellow-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          {isGrowthPlan && (
            <p className="text-sm text-muted-foreground">
              Growth plan: {currentMemberCount}/3 members used
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};