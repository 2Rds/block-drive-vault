import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateTeamModalProps {
  createTeam: (teamData: { name: string; description?: string }) => Promise<any>;
}

export const CreateTeamModal = ({ createTeam }: CreateTeamModalProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const { subscriptionStatus } = useSubscriptionStatus();

  // Tiers that allow team creation
  const TEAM_ENABLED_TIERS = ['scale', 'growth', 'business', 'enterprise'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    // Teams require a paid tier that supports team features
    const isSubscribed = subscriptionStatus?.subscribed || false;
    const subscriptionTier = subscriptionStatus?.subscription_tier?.toLowerCase() || 'free';

    if (!isSubscribed || !TEAM_ENABLED_TIERS.includes(subscriptionTier)) {
      toast.error('Teams require a Growth, Scale, Business, or Enterprise subscription');
      return;
    }

    setLoading(true);
    try {
      const team = await createTeam(formData);
      if (team) {
        setOpen(false);
        setFormData({ name: '', description: '' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Check subscription status - teams require paid tier with team features
  const isSubscribed = subscriptionStatus?.subscribed || false;
  const subscriptionTier = subscriptionStatus?.subscription_tier?.toLowerCase() || 'free';
  const hasTeamTier = TEAM_ENABLED_TIERS.includes(subscriptionTier);
  const canCreateTeam = isSubscribed && hasTeamTier;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          disabled={!canCreateTeam}
        >
          <Plus className="h-4 w-4" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name</Label>
            <Input
              id="name"
              placeholder="Enter team name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter team description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name.trim()}>
              {loading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};