import { OrganizationProfile, useOrganization } from '@clerk/clerk-react';
import { Header } from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Loading state component
function LoadingState(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="text-gray-400">Loading...</div>
      </div>
    </div>
  );
}

// Clerk OrganizationProfile appearance configuration
const ORG_PROFILE_APPEARANCE = {
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0",
    navbar: "bg-gray-800/50 rounded-lg",
    navbarButton: "text-gray-300 hover:text-white hover:bg-gray-700",
    navbarButtonActive: "text-white bg-gray-700",
    pageScrollBox: "p-0",
    page: "p-0",
    profileSection: "border-gray-700",
    profileSectionTitle: "text-white",
    profileSectionContent: "text-gray-300",
    formFieldLabel: "text-gray-300",
    formFieldInput: "bg-gray-700 border-gray-600 text-white",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
    membersPageInviteButton: "bg-blue-600 hover:bg-blue-700",
    tableHead: "text-gray-400",
    tableCell: "text-gray-300",
    badge: "bg-gray-700 text-gray-300",
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
    return <LoadingState />;
  }

  if (!organization) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Team Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your team members, invitations, and organization settings
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <OrganizationProfile appearance={ORG_PROFILE_APPEARANCE} />
        </div>
      </div>
    </div>
  );
}
