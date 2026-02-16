/**
 * OrganizationJoinStep Component
 *
 * Auto-detects if the user's email domain matches a verified organization.
 * - If match found: offers the user a one-click join
 * - If no match: auto-skips (invisible step)
 *
 * Users can always create or join orgs later from the dashboard.
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export interface OrganizationContext {
  id: string;
  name: string;
  subdomain: string;
  role: string;
}

interface OrganizationMatch {
  id: string;
  name: string;
  subdomain: string;
  defaultRole?: string;
}

interface OrganizationJoinStepProps {
  onComplete: (orgContext: OrganizationContext | null) => void;
  onSkip: () => void;
}

export function OrganizationJoinStep({ onComplete, onSkip }: OrganizationJoinStepProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [match, setMatch] = useState<OrganizationMatch | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-check email domain on mount
  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      onSkip();
      return;
    }

    const checkDomain = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-email-org-membership`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ email: email.toLowerCase() }),
          }
        );

        const result = await response.json();

        if (result.hasOrganization && result.organization) {
          setMatch({
            id: result.organization.id,
            name: result.organization.name,
            subdomain: result.organization.subdomain,
            defaultRole: result.defaultRole,
          });
          setIsChecking(false);
        } else {
          // No match — skip silently
          onSkip();
        }
      } catch {
        // On error, skip — user can join later from dashboard
        onSkip();
      }
    };

    checkDomain();
  }, [user, onSkip]);

  const handleJoin = useCallback(async () => {
    if (!match) return;
    setIsJoining(true);
    setError(null);

    try {
      const token = await getToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-org-by-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );

      const result = await response.json();

      if (result.joined || result.success) {
        setJoined(true);
        const orgContext: OrganizationContext = {
          id: result.organization?.id || match.id,
          name: result.organization?.name || match.name,
          subdomain: result.organization?.subdomain || match.subdomain,
          role: result.role || match.defaultRole || 'member',
        };
        setTimeout(() => onComplete(orgContext), 800);
      } else {
        setError(result.error || 'Failed to join organization');
        setIsJoining(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join organization');
      setIsJoining(false);
    }
  }, [match, getToken, onComplete]);

  // Loading state while checking domain
  if (isChecking) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Checking your account...</p>
      </div>
    );
  }

  // Joined successfully
  if (joined && match) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Joined {match.name}!</h2>
        <p className="text-muted-foreground text-sm">You're now part of the team</p>
      </div>
    );
  }

  // Match found — show join offer
  if (match) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Organization Found</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Your email matches a registered organization
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{match.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {match.subdomain}.blockdrive.sol
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Button onClick={handleJoin} disabled={isJoining} className="w-full">
            {isJoining ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Join {match.name}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <Button onClick={onSkip} variant="ghost" className="w-full text-muted-foreground">
            Skip — I'll do this later
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
