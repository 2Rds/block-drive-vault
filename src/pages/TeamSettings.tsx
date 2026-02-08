import { OrganizationProfile, useOrganization } from '@clerk/clerk-react';
import { AppShell } from '@/components/layout';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Clerk OrganizationProfile appearance configuration for dark theme
const ORG_PROFILE_APPEARANCE = {
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0",
    navbar: "bg-background-secondary rounded-lg",
    navbarButton: "text-foreground-muted hover:text-foreground hover:bg-background-tertiary",
    navbarButtonActive: "text-foreground bg-background-tertiary",
    pageScrollBox: "p-0",
    page: "p-0",
    profileSection: "border-border",
    profileSectionTitle: "text-foreground",
    profileSectionContent: "text-foreground-muted",
    formFieldLabel: "text-foreground-muted",
    formFieldInput: "bg-background-tertiary border-border text-foreground",
    formButtonPrimary: "bg-primary hover:bg-primary/90",
    membersPageInviteButton: "bg-primary hover:bg-primary/90",
    tableHead: "text-foreground-muted",
    tableCell: "text-foreground-muted",
    badge: "bg-background-tertiary text-foreground-muted",
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
      <div className="bg-card rounded-lg border border-border p-6">
        <OrganizationProfile appearance={ORG_PROFILE_APPEARANCE} />
      </div>
    </AppShell>
  );
}
