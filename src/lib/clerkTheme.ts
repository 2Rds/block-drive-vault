import type { Appearance } from '@clerk/types';

// Vault Noir design tokens
const bg = '#0a0a0b';
const surface = '#18181b';     // zinc-900
const surfaceHover = '#27272a'; // zinc-800
const border = '#27272a';       // zinc-800
const borderLight = '#3f3f46';  // zinc-700
const textPrimary = '#fafafa';
const textSecondary = '#a1a1aa'; // zinc-400
const textMuted = '#71717a';     // zinc-500
const blue500 = '#3b82f6';
const blue600 = '#2563eb';
const purple500 = '#8b5cf6';
const purple600 = '#7c3aed';
const danger = '#ef4444';

// Shared base elements (style objects — guaranteed to override Clerk defaults)
const baseElements = {
  // Cards & popovers
  card: {
    backgroundColor: surface,
    borderColor: border,
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },

  // Headers
  headerTitle: { color: textPrimary },
  headerSubtitle: { color: textSecondary },

  // Forms
  formFieldLabel: { color: textPrimary },
  formFieldInput: {
    backgroundColor: bg,
    borderColor: borderLight,
    color: textPrimary,
    borderRadius: '0.5rem',
  },
  formFieldAction: { color: blue500 },
  formResendCodeLink: { color: blue500 },
  formFieldHintText: { color: textSecondary },
  formFieldSuccessText: { color: '#22c55e' },
  formFieldErrorText: { color: danger },

  // Social / OAuth buttons
  socialButtonsBlockButton: {
    backgroundColor: surfaceHover,
    borderColor: borderLight,
    color: textPrimary,
  },
  socialButtonsBlockButtonText: { color: textPrimary, fontWeight: 500 },
  socialButtonsIconButton: {
    backgroundColor: surfaceHover,
    borderColor: borderLight,
    borderWidth: '1px',
    borderStyle: 'solid',
  },

  // Dividers
  dividerLine: { backgroundColor: border },
  dividerText: { color: textMuted },

  // Footer
  footerActionLink: { color: blue500 },
  footerActionText: { color: textSecondary },

  // Badges
  badge: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    color: '#c4b5fd',
    borderColor: 'rgba(139,92,246,0.3)',
  },

  // Avatars
  avatarBox: { borderColor: borderLight },
  avatarImageActionsUpload: { color: blue500 },

  // File upload
  fileDropAreaBox: {
    borderColor: borderLight,
    borderStyle: 'dashed',
    backgroundColor: surface,
    borderRadius: '0.5rem',
  },
  fileDropAreaIcon: { color: textSecondary },
  fileDropAreaHint: { color: textSecondary },
  fileDropAreaButtonPrimary: { color: blue500, fontWeight: 500 },

  // OTP
  otpCodeFieldInput: {
    backgroundColor: bg,
    borderColor: borderLight,
    color: textPrimary,
  },

  // Tags
  tagInputContainer: { backgroundColor: bg, borderColor: borderLight },
  tagPillContainer: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderColor: 'rgba(59,130,246,0.3)',
  },
  tagPillText: { color: blue500 },

  // Navbar (OrganizationProfile, UserProfile)
  navbar: { backgroundColor: 'rgba(24,24,27,0.5)', borderRadius: '0.5rem' },
  navbarButton: { color: textSecondary },
  navbarButtonActive: { color: textPrimary, backgroundColor: surfaceHover },

  // Profile sections
  profileSection: { borderColor: border },
  profileSectionTitle: { color: textPrimary },
  profileSectionSubtitle: { color: textSecondary },
  profileSectionContent: { color: textSecondary },
  profileSectionPrimaryButton: { color: textPrimary },

  // Tabs (Members / Invitations within OrganizationProfile)
  tabButton: { color: textSecondary },
  tabButtonActive: { color: textPrimary, borderColor: blue500 },
  tabListContainer: { borderColor: border },
  tabPanel: { color: textPrimary },

  // Tables
  tableHead: { color: textSecondary },
  tableCell: { color: textSecondary },

  // User button popover
  userButtonPopoverCard: {
    backgroundColor: surface,
    borderColor: border,
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  userButtonPopoverActionButton: { color: textPrimary },
  userButtonPopoverActionButtonText: { color: textPrimary },
  userButtonPopoverActionButtonIcon: { color: textSecondary },
  userButtonPopoverFooter: { borderColor: border },

  // Organization switcher popover
  organizationSwitcherPopoverCard: {
    backgroundColor: surface,
    borderColor: border,
    borderWidth: '1px',
    borderStyle: 'solid',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
  },
  organizationSwitcherPopoverActionButton: { color: textPrimary },
  organizationSwitcherPopoverActionButtonText: { color: textPrimary },
  organizationSwitcherPopoverActionButtonIcon: { color: textSecondary },
  organizationSwitcherPopoverFooter: { borderColor: border },

  // Organization preview (in popovers & switcher)
  organizationPreviewMainIdentifier: { color: textPrimary, fontWeight: 500 },
  organizationPreviewSecondaryIdentifier: { color: textSecondary },

  // Personal account preview (in org switcher)
  userPreview: { color: textPrimary },
  userPreviewMainIdentifier: { color: textPrimary, fontWeight: 500 },
  userPreviewSecondaryIdentifier: { color: textSecondary },
  userPreviewTextContainer: { color: textPrimary },

  // Identity preview
  identityPreview: { backgroundColor: surface, borderColor: borderLight },
  identityPreviewText: { color: textPrimary },
  identityPreviewEditButton: { color: blue500 },

  // Misc
  formFieldInputShowPasswordButton: { color: textSecondary },
  alertText: { color: textPrimary },
  main: { color: textPrimary },

  // Select menus
  selectButton: { backgroundColor: bg, borderColor: borderLight, color: textPrimary },
  selectOption: { color: textPrimary },
  selectOptionActive: { backgroundColor: surfaceHover },

  // Page / scroll
  pageScrollBox: { color: textPrimary },
  page: { color: textPrimary },
};

// ─── Option A: Solid blue-500 ───────────────────────────────────────────────
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: blue500,
    colorText: textPrimary,
    colorTextSecondary: textSecondary,
    colorBackground: surface,
    colorInputBackground: bg,
    colorInputText: textPrimary,
    colorDanger: danger,
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    ...baseElements,
    formButtonPrimary: {
      backgroundColor: blue500,
      color: '#ffffff',
      fontWeight: 500,
      boxShadow: '0 10px 15px -3px rgba(59,130,246,0.2)',
    },
    membersPageInviteButton: {
      backgroundColor: blue500,
      color: '#ffffff',
    },
  },
};

// ─── Option B: Blue-to-purple gradient ──────────────────────────────────────
export const clerkAppearanceGradient: Appearance = clerkAppearance;

// ─── Option C: Middle ground — zinc-900 cards, darker insets, gradient accents
const midSurface = '#131316';   // between #0a0a0b and #18181b
const midBorder = '#27272a';    // zinc-800 — visible against both dark and light

export const clerkAppearanceDeep: Appearance = {
  variables: {
    colorPrimary: blue500,
    colorText: textPrimary,
    colorTextSecondary: textSecondary,
    colorBackground: midSurface,
    colorInputBackground: bg,
    colorInputText: textPrimary,
    colorDanger: danger,
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    ...baseElements,
    card: {
      backgroundColor: midSurface,
      borderColor: midBorder,
      borderWidth: '1px',
      borderStyle: 'solid',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    },
    formFieldInput: {
      backgroundColor: bg,
      borderColor: borderLight,
      color: textPrimary,
      borderRadius: '0.5rem',
    },
    socialButtonsBlockButton: {
      backgroundColor: bg,
      borderColor: borderLight,
      color: textPrimary,
    },
    formButtonPrimary: {
      background: `linear-gradient(to right, ${blue500}, ${purple500})`,
      color: '#ffffff',
      fontWeight: 500,
      boxShadow: '0 10px 15px -3px rgba(59,130,246,0.25)',
    },
    membersPageInviteButton: {
      background: `linear-gradient(to right, ${blue500}, ${purple500})`,
      color: '#ffffff',
    },
    navbar: { backgroundColor: 'rgba(10,10,11,0.5)', borderRadius: '0.5rem' },
    navbarButtonActive: { color: textPrimary, backgroundColor: surfaceHover },
    userButtonPopoverCard: {
      backgroundColor: midSurface,
      borderColor: midBorder,
      borderWidth: '1px',
      borderStyle: 'solid',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    },
    organizationSwitcherPopoverCard: {
      backgroundColor: midSurface,
      borderColor: midBorder,
      borderWidth: '1px',
      borderStyle: 'solid',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    },
    identityPreview: { backgroundColor: bg, borderColor: borderLight },
    fileDropAreaBox: {
      borderColor: borderLight,
      borderStyle: 'dashed',
      backgroundColor: bg,
      borderRadius: '0.5rem',
    },
    otpCodeFieldInput: {
      backgroundColor: bg,
      borderColor: borderLight,
      color: textPrimary,
    },
    tagInputContainer: { backgroundColor: bg, borderColor: borderLight },
    selectButton: { backgroundColor: bg, borderColor: borderLight, color: textPrimary },
    footerActionLink: { color: purple500 },
    formFieldAction: { color: purple500 },
    badge: {
      backgroundColor: 'rgba(139,92,246,0.15)',
      color: '#c4b5fd',
      borderColor: 'rgba(139,92,246,0.3)',
    },
    tagPillContainer: {
      backgroundColor: 'rgba(139,92,246,0.15)',
      borderColor: 'rgba(139,92,246,0.3)',
    },
    tagPillText: { color: purple500 },
  },
};

// Legacy alias — kept so old gradient import still resolves
export const _clerkAppearanceGradientOriginal: Appearance = {
  variables: {
    colorPrimary: blue500,
    colorText: textPrimary,
    colorTextSecondary: textSecondary,
    colorBackground: surface,
    colorInputBackground: bg,
    colorInputText: textPrimary,
    colorDanger: danger,
    borderRadius: '0.75rem',
    fontFamily: 'inherit',
  },
  elements: {
    ...baseElements,
    formButtonPrimary: {
      background: `linear-gradient(to right, ${blue500}, ${purple500})`,
      color: '#ffffff',
      fontWeight: 500,
      boxShadow: '0 10px 15px -3px rgba(59,130,246,0.2)',
    },
    membersPageInviteButton: {
      background: `linear-gradient(to right, ${blue500}, ${purple500})`,
      color: '#ffffff',
    },
    footerActionLink: { color: purple500 },
    formFieldAction: { color: purple500 },
    badge: {
      backgroundColor: 'rgba(139,92,246,0.15)',
      color: '#c4b5fd',
      borderColor: 'rgba(139,92,246,0.3)',
    },
    tagPillContainer: {
      backgroundColor: 'rgba(139,92,246,0.15)',
      borderColor: 'rgba(139,92,246,0.3)',
    },
    tagPillText: { color: purple500 },
  },
};
