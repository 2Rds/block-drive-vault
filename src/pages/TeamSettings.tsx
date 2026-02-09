import { OrganizationProfile, useOrganization } from '@clerk/clerk-react';
import { AppShell } from '@/components/layout';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { clerkAppearanceDeep as clerkAppearance } from '@/lib/clerkTheme';

const LOCAL_APPEARANCE = {
  elements: {
    card: 'bg-transparent shadow-none border-0',
    rootBox: 'w-full',
    pageScrollBox: 'p-0',
    page: 'p-0',
  },
};

export default function TeamSettings(): JSX.Element | null {
  const { organization, isLoaded } = useOrganization();
  const navigate = useNavigate();

  // Redirect to dashboard if no organization is active
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
      <div className="bg-card border border-border/50 rounded-xl p-6">
        <OrganizationProfile appearance={{
          ...clerkAppearance,
          elements: { ...clerkAppearance.elements, ...LOCAL_APPEARANCE.elements },
        }} />
      </div>
    </AppShell>
  );
}
