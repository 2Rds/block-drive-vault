/**
 * useOrganizations Hook
 *
 * Stub replacing the legacy auth-dependent version. WS6 will rebuild this
 * entirely on Supabase. For now, provides the same interface with
 * org operations disabled.
 *
 * Supabase handles:
 * - SNS subdomain records
 * - NFT ownership data
 * - Custom invite codes
 * - Email domain verification
 * - Organization-specific settings
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrganization, useOrganizationList, useAuth } from '@/hooks/useOrganizationCompat';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { toast } from 'sonner';

// BlockDrive organization data (stored in Supabase)
export interface OrganizationBlockDriveData {
  id: string;
  orgId: string;
  subdomain: string;
  snsRegistryKey?: string;
  orgNftMint?: string;
  subscriptionTier?: 'business' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: string;
}

// Combined organization type
export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  membersCount: number;
  role: string;
  subdomain?: string;
  snsDomain?: string;
  subscriptionTier?: 'business' | 'enterprise';
  hasSubdomainNft?: boolean;
}

// Organization member with BlockDrive extensions
export interface OrganizationMember {
  id: string;
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  orgUsername?: string;
  orgSubdomainNftId?: string;
  joinMethod?: 'invite_code' | 'email_domain' | 'direct_invite' | 'owner';
  joinedAt: string;
}

// Invite code type
export interface OrganizationInviteCode {
  id: string;
  code: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  defaultRole: string;
  createdAt: string;
}

// Email domain type
export interface OrganizationEmailDomain {
  id: string;
  domain: string;
  verifiedAt: string | null;
  autoJoin: boolean;
  defaultRole: string;
  isPrimary: boolean;
}

// Pending invitation type
export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  sentAt: string;
  expiresAt: string | null;
  invitedBy?: string;
}

export const useOrganizations = () => {
  const { userId, supabase } = useDynamicAuth();
  const { getToken } = useAuth();
  const { organization: activeOrg, membership: activeMembership, isLoaded: orgLoaded } = useOrganization();
  const { isLoaded: listLoaded } = useOrganizationList();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<OrganizationInviteCode[]>([]);
  const [emailDomains, setEmailDomains] = useState<OrganizationEmailDomain[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(false);

  // WS6 will rebuild org management on Supabase.
  // For now, return stubs for all org operations.

  const noopAsync = async () => {};
  const notImplemented = async () => {
    toast.info('Organization management is being upgraded');
    throw new Error('Organization management will be available after WS6');
  };

  const currentOrganization: Organization | null = activeOrg ? {
    id: activeOrg.id,
    name: activeOrg.name,
    slug: activeOrg.slug,
    imageUrl: '',
    membersCount: 0,
    role: activeMembership?.role || 'member',
  } : null;

  const canManageOrganization = activeMembership?.role === 'admin' || activeMembership?.role === 'org:admin';

  return {
    organizations: [] as Organization[],
    currentOrganization,
    members,
    inviteCodes,
    emailDomains,
    pendingInvitations,
    loading: !orgLoaded || !listLoaded || loading,
    error: null as string | null,
    canManageOrganization,
    createOrganization: notImplemented,
    switchOrganization: noopAsync,
    generateInviteCode: notImplemented,
    deactivateInviteCode: noopAsync,
    addEmailDomain: notImplemented,
    removeMember: notImplemented,
    updateMemberRole: notImplemented,
    sendTeamInvitation: notImplemented,
    revokeInvitation: noopAsync,
    resendInvitation: notImplemented,
    refreshMembers: noopAsync,
    refreshInviteCodes: noopAsync,
    refreshEmailDomains: noopAsync,
    refreshPendingInvitations: noopAsync,
  };
};
