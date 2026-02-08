import { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Globe } from 'lucide-react';

interface AddEmailDomainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (domain: string) => Promise<void>;
  teamName: string;
}

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/;

export function AddEmailDomainModal({
  open,
  onOpenChange,
  onAdd,
  teamName,
}: AddEmailDomainModalProps) {
  const [domain, setDomain] = useState('');
  const [autoJoin, setAutoJoin] = useState(true);
  const [defaultRole, setDefaultRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanDomain = domain.replace(/^@/, '').toLowerCase();
  const isValidDomain = DOMAIN_REGEX.test(cleanDomain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidDomain) {
      setError('Please enter a valid domain (e.g., company.com)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd(cleanDomain);
      setDomain('');
      setAutoJoin(true);
      setDefaultRole('member');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setDomain('');
      setAutoJoin(true);
      setDefaultRole('member');
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Add Email Domain
          </DialogTitle>
          <DialogDescription>
            Allow users with this email domain to automatically join {teamName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Email Domain</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="domain"
                  type="text"
                  placeholder="company.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value.replace(/^@/, ''))}
                  disabled={loading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Users with @{cleanDomain || 'company.com'} emails can join this team.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-join">Auto-join</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically add users with this domain when they sign up.
                </p>
              </div>
              <Switch
                id="auto-join"
                checked={autoJoin}
                onCheckedChange={setAutoJoin}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="default-role">Default Role</Label>
              <Select value={defaultRole} onValueChange={setDefaultRole} disabled={loading}>
                <SelectTrigger id="default-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Role assigned to users who join via this domain.
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !domain}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Domain'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
