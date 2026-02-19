/**
 * Team Settings page — stub until WS6 (Supabase org management).
 */

import { useOrganization } from '@/hooks/useOrganizationCompat';
import { AppShell } from '@/components/layout';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function TeamSettings(): JSX.Element | null {
  const { organization, isLoaded } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !organization) {
      navigate('/dashboard');
    }
  }, [isLoaded, organization, navigate]);

  if (!isLoaded) {
    return (
      <AppShell title="Team Settings" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="text-foreground-muted">Loading...</div>
        </div>
      </AppShell>
    );
  }

  if (!organization) {
    return null;
  }

  return (
    <AppShell
      title="Team Settings"
      description="Manage your team members, invitations, and organization settings"
    >
      <div className="bg-card border border-border/50 rounded-xl p-6 text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">
          {organization.name}
        </h2>
        <p className="text-muted-foreground">
          Team management is being upgraded. Full settings will be available soon.
        </p>
      </div>
    </AppShell>
  );
}
