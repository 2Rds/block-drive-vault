import { CreateOrganization, useOrganizationList } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Users, FolderLock, Share2, Building2, LucideIcon } from 'lucide-react';

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

// Clerk CSS variable overrides for dark theme
const CLERK_CSS_VARIABLES = {
  '--cl-color-text-primary': '#ffffff',
  '--cl-color-text-secondary': '#a1a1aa',
  '--cl-color-text-tertiary': '#71717a',
  '--cl-color-background-primary': '#0c0c0c',
  '--cl-color-background-secondary': '#18181b',
  '--cl-color-border-primary': '#3f3f46',
  '--cl-color-border-secondary': '#27272a',
  '--cl-color-brand-primary': '#2dd4bf',
  '--cl-color-brand-primary-hover': '#14b8a6',
} as React.CSSProperties;

// Clerk appearance configuration
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#2dd4bf',
    colorText: '#ffffff',
    colorTextSecondary: '#a1a1aa',
    colorBackground: '#0c0c0c',
    colorInputBackground: '#0c0c0c',
    colorInputText: '#ffffff',
    borderRadius: '0.5rem',
  },
  elements: {
    rootBox: 'w-full',
    card: 'shadow-none bg-transparent border-0 p-0',
    headerTitle: 'text-white text-lg font-semibold',
    headerSubtitle: 'text-[#a1a1aa] text-sm',
    formButtonPrimary:
      'bg-gradient-to-r from-[#2dd4bf] to-[#0d9488] hover:from-[#14b8a6] hover:to-[#0f766e] text-[#0c0c0c] font-semibold shadow-lg shadow-[#2dd4bf]/20 border-0',
    formFieldInput:
      'bg-[#0c0c0c] border-[#3f3f46] text-white placeholder:text-[#71717a] focus:border-[#2dd4bf] focus:ring-[#2dd4bf]/20 rounded-lg',
    formFieldLabel: 'text-white text-sm font-medium',
    formFieldLabelRow: 'text-white',
    formFieldHintText: 'text-[#a1a1aa]',
    formFieldSuccessText: 'text-[#2dd4bf]',
    formFieldErrorText: 'text-red-400',
    dividerLine: 'bg-[#3f3f46]',
    dividerText: 'text-[#a1a1aa]',
    socialButtonsBlockButton:
      'border-[#3f3f46] bg-[#18181b] hover:bg-[#27272a] text-white',
    socialButtonsBlockButtonText: 'text-white font-medium',
    footer: 'hidden',
    footerAction: 'hidden',
    footerActionLink: 'hidden',
    logoBox: 'hidden',
    logoImage: 'hidden',
    organizationPreview: 'bg-[#18181b] border-[#3f3f46]',
    organizationPreviewMainIdentifier: 'text-white font-medium',
    organizationPreviewSecondaryIdentifier: 'text-[#a1a1aa]',
    avatarBox: 'border-[#3f3f46]',
    avatarImageActionsUpload: 'text-[#2dd4bf] hover:text-[#14b8a6] font-medium',
    fileDropAreaBox: 'border-[#3f3f46] border-dashed border-2 bg-[#18181b] hover:bg-[#27272a] hover:border-[#2dd4bf]/50 rounded-lg',
    fileDropAreaIconBox: 'bg-[#27272a] rounded-lg',
    fileDropAreaIcon: 'text-[#a1a1aa]',
    fileDropAreaHint: 'text-[#a1a1aa] text-sm',
    fileDropAreaFooterHint: 'text-[#a1a1aa]',
    fileDropAreaButtonPrimary: 'text-[#2dd4bf] hover:text-[#14b8a6] font-semibold',
    formResendCodeLink: 'text-[#2dd4bf] hover:text-[#14b8a6]',
    identityPreview: 'bg-[#18181b] border-[#3f3f46]',
    identityPreviewText: 'text-white',
    identityPreviewEditButton: 'text-[#2dd4bf] hover:text-[#14b8a6]',
    formFieldInputShowPasswordButton: 'text-[#a1a1aa] hover:text-white',
    otpCodeFieldInput: 'bg-[#0c0c0c] border-[#3f3f46] text-white',
    alertText: 'text-white',
    badge: 'bg-[#2dd4bf]/20 text-[#2dd4bf] border-[#2dd4bf]/30',
    tagInputContainer: 'bg-[#0c0c0c] border-[#3f3f46]',
    tagPillContainer: 'bg-[#2dd4bf]/20 border-[#2dd4bf]/30',
    tagPillText: 'text-[#2dd4bf]',
    main: 'text-white',
    form: 'text-white',
    formFieldRow: 'text-white',
    formField: 'text-white',
    formFieldAction: 'text-[#2dd4bf]',
  },
  layout: {
    showOptionalFields: false,
  },
};

// Global CSS overrides for Clerk components
const CLERK_GLOBAL_STYLES = `
  .cl-formFieldLabel,
  .cl-formFieldLabelRow__organizationName,
  .cl-formFieldLabelRow,
  [data-localization-key] {
    color: #ffffff !important;
  }
  .cl-fileDropAreaHint,
  .cl-fileDropAreaFooterHint,
  .cl-organizationSwitcherTrigger__organizationPreview {
    color: #a1a1aa !important;
  }
  .cl-fileDropAreaButtonPrimary,
  .cl-avatarImageActionsUpload {
    color: #2dd4bf !important;
    font-weight: 600;
  }
  .cl-formFieldInput {
    background-color: #0c0c0c !important;
    border-color: #3f3f46 !important;
    color: #ffffff !important;
  }
  .cl-formFieldInput::placeholder {
    color: #71717a !important;
  }
  .cl-formFieldInput:focus {
    border-color: #2dd4bf !important;
  }
  .cl-fileDropAreaBox {
    background-color: #18181b !important;
    border-color: #3f3f46 !important;
  }
  .cl-fileDropAreaBox:hover {
    background-color: #27272a !important;
    border-color: #2dd4bf !important;
  }
  .cl-formButtonPrimary {
    background: linear-gradient(to right, #2dd4bf, #0d9488) !important;
    color: #0c0c0c !important;
    font-weight: 600 !important;
  }
  .cl-formButtonPrimary:hover {
    background: linear-gradient(to right, #14b8a6, #0f766e) !important;
  }
  .cl-internal-b3fm6y,
  .cl-footerAction,
  .cl-footer {
    display: none !important;
  }
`;

function BenefitCard({ icon: Icon, title, description }: TeamBenefit): JSX.Element {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-[#18181b]/80 border border-[#27272a]">
      <div className="p-2 rounded-lg bg-[#2dd4bf]/10">
        <Icon className="w-5 h-5 text-[#2dd4bf]" />
      </div>
      <div>
        <h3 className="font-medium text-white">{title}</h3>
        <p className="text-sm text-[#71717a]">{description}</p>
      </div>
    </div>
  );
}

export default function CreateTeamOnboarding(): JSX.Element {
  const navigate = useNavigate();
  const { organizationList, isLoaded } = useOrganizationList();

  // If user already has organizations, redirect to dashboard
  useEffect(() => {
    if (isLoaded && organizationList && organizationList.length > 0) {
      navigate('/dashboard');
    }
  }, [isLoaded, organizationList, navigate]);

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle grid pattern overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={GRID_PATTERN_STYLE}
      />

      {/* Gradient glow effects */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-[#2dd4bf]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#0d9488]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-lg w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2dd4bf]/20 to-[#0d9488]/20 border border-[#2dd4bf]/30 mb-4">
            <Building2 className="w-8 h-8 text-[#2dd4bf]" />
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

        {/* Clerk CreateOrganization with custom CSS variables */}
        <div
          className="bg-[#18181b]/90 backdrop-blur-sm rounded-2xl border border-[#27272a] p-6"
          style={CLERK_CSS_VARIABLES}
        >
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard"
            skipInvitationScreen={true}
            appearance={CLERK_APPEARANCE}
          />
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-[#71717a]">
          You can manage your team settings anytime from the dashboard
        </p>
      </div>

      {/* Global style overrides for Clerk components */}
      <style>{CLERK_GLOBAL_STYLES}</style>
    </div>
  );
}
