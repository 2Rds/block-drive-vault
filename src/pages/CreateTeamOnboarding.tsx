import { CreateOrganization, useOrganizationList, useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Users, FolderLock, Share2, Building2, User, ArrowRight, LucideIcon, Loader2 } from 'lucide-react';
import { clerkAppearanceDeep as clerkAppearance } from '@/lib/clerkTheme';

// Grid pattern background style
const GRID_PATTERN_STYLE = {
  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
  backgroundSize: '60px 60px'
};

// Team benefits data
interface TeamBenefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const TEAM_BENEFITS: TeamBenefit[] = [
  {
    icon: Users,
    title: 'Invite Team Members',
    description: 'Add colleagues and manage roles with built-in team management',
  },
  {
    icon: FolderLock,
    title: 'Shared Team Files',
    description: 'Upload files visible to all team members or keep them private',
  },
  {
    icon: Share2,
    title: 'Secure Sharing',
    description: 'Send files directly to teammates with end-to-end encryption',
  },
];

// Local overrides for CreateOrganization embedded in the onboarding card
const LOCAL_APPEARANCE = {
  elements: {
    card: 'shadow-none bg-transparent border-0 p-0',
    footer: 'hidden',
    footerAction: 'hidden',
    logoBox: 'hidden',
  },
  layout: {
    showOptionalFields: false,
  },
};

function BenefitCard({ icon: Icon, title, description }: TeamBenefit): JSX.Element {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#18181b]/80 border border-[#27272a]">
      <div className="p-2 rounded-lg bg-blue-500/10">
        <Icon className="w-5 h-5 text-blue-400" />
      </div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-[#71717a]">{description}</p>
      </div>
    </div>
  );
}

function NameStep({ onComplete }: { onComplete: () => void }): JSX.Element {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide both your first and last name.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await user?.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      onComplete();
    } catch {
      setError('Failed to save your name. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg w-full space-y-8 relative z-10">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 mb-4">
          <User className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">
          Tell us your name
        </h1>
        <p className="text-[#a1a1aa] max-w-md mx-auto">
          Your name will be visible to team members you collaborate with.
        </p>
      </div>

      {/* Name form */}
      <form onSubmit={handleSubmit} className="bg-[#18181b]/90 backdrop-blur-sm rounded-2xl border border-[#27272a] p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="firstName" className="block text-sm font-medium text-zinc-200">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-50 placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-lg outline-none transition-colors"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="block text-sm font-medium text-zinc-200">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-50 placeholder:text-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-lg outline-none transition-colors"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg shadow-lg shadow-blue-500/20 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-[#71717a]">
        You can update your name anytime in your profile settings
      </p>
    </div>
  );
}

export default function CreateTeamOnboarding(): JSX.Element {
  const navigate = useNavigate();
  const { user, isLoaded: userLoaded } = useUser();
  const { organizationList, isLoaded } = useOrganizationList();

  // Skip the name step if user already has a name set
  const hasName = Boolean(user?.firstName && user?.lastName);
  const [nameComplete, setNameComplete] = useState(hasName);

  // Sync once user data loads
  useEffect(() => {
    if (userLoaded && hasName) {
      setNameComplete(true);
    }
  }, [userLoaded, hasName]);

  // If user already has organizations, redirect to dashboard
  useEffect(() => {
    if (isLoaded && organizationList && organizationList.length > 0) {
      navigate('/dashboard');
    }
  }, [isLoaded, organizationList, navigate]);

  const showNameStep = userLoaded && !nameComplete;

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={GRID_PATTERN_STYLE}
      />

      {/* Gradient glow effects */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {showNameStep ? (
        <NameStep onComplete={() => setNameComplete(true)} />
      ) : (
        <div className="max-w-lg w-full space-y-8 relative z-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 mb-4">
              <Building2 className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">
              Create Your Team
            </h1>
            <p className="text-[#a1a1aa] max-w-md mx-auto">
              Set up your team workspace to collaborate with others and share files securely.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid gap-3">
            {TEAM_BENEFITS.map((benefit) => (
              <BenefitCard key={benefit.title} {...benefit} />
            ))}
          </div>

          {/* Clerk CreateOrganization */}
          <div className="bg-[#18181b]/90 backdrop-blur-sm rounded-2xl border border-[#27272a] p-6">
            <CreateOrganization
              afterCreateOrganizationUrl="/dashboard"
              skipInvitationScreen={true}
              appearance={{
                ...clerkAppearance,
                elements: { ...clerkAppearance.elements, ...LOCAL_APPEARANCE.elements },
                layout: LOCAL_APPEARANCE.layout,
              }}
            />
          </div>

          {/* Help text */}
          <p className="text-center text-xs text-[#71717a]">
            You can manage your team settings anytime from the dashboard
          </p>
        </div>
      )}

    </div>
  );
}
