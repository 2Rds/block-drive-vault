/**
 * useOrganizations Hook
 *
 * Bridges Clerk's native Organizations feature with BlockDrive's Supabase infrastructure.
 *
 * Clerk handles:
 * - User-organization membership
 * - Organization switching
 * - Organization metadata
 * - Member invitations (Clerk-native)
 *
 * Supabase handles:
 * - SNS subdomain records
 * - NFT ownership data
 * - Custom invite codes
 * - Email domain verification
 * - Organization-specific settings
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useOrganization,
  useOrganizationList,
  useUser,
  useAuth
} from '@clerk/clerk-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { toast } from 'sonner';

// BlockDrive organization data (stored in Supabase)
export interface OrganizationBlockDriveData {
  id: string;
  clerkOrgId: string;
  subdomain: string;
  snsRegistryKey?: string;
  orgNftMint?: string;
  subscriptionTier?: 'business' | 'enterprise';
  settings: Record<string, unknown>;
  createdAt: string;
}

// Combined organization type
export interface Organization {
  // Clerk data
  id: string;
  name: string;
  slug: string | null;
  imageUrl: string;
  membersCount: number;
  role: string;
  // BlockDrive data
  subdomain?: string;
  snsDomain?: string;
  subscriptionTier?: 'business' | 'enterprise';
  hasSubdomainNft?: boolean;
}

// Organization member with BlockDrive extensions
export interface OrganizationMember {
  id: string;
  clerkUserId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  // BlockDrive extensions
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

export const useOrganizations = () => {
  const { userId, supabase, isSignedIn } = useClerkAuth();
  const { getToken } = useAuth();
  const { user } = useUser();

  // Clerk organization hooks
  const {
    organization: activeOrg,
    membership: activeMembership,
    isLoaded: orgLoaded
  } = useOrganization();

  const {
    organizationList,
    isLoaded: listLoaded,
    setActive,
    createOrganization: clerkCreateOrg
  } = useOrganizationList({
    userMemberships: {
      infinite: true,
    }
  });

  // Local state for BlockDrive-specific data
  const [blockdriveOrgData, setBlockdriveOrgData] = useState<Map<string, OrganizationBlockDriveData>>(new Map());
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<OrganizationInviteCode[]>([]);
  const [emailDomains, setEmailDomains] = useState<OrganizationEmailDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch BlockDrive organization data from Supabase
  const fetchBlockDriveOrgData = useCallback(async (clerkOrgIds: string[]) => {
    if (!supabase || clerkOrgIds.length === 0) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .in('clerk_org_id', clerkOrgIds);

      if (fetchError) throw fetchError;

      const dataMap = new Map<string, OrganizationBlockDriveData>();
      (data || []).forEach((org: any) => {
        dataMap.set(org.clerk_org_id, {
          id: org.id,
          clerkOrgId: org.clerk_org_id,
          subdomain: org.subdomain,
          snsRegistryKey: org.sns_registry_key,
          orgNftMint: org.org_nft_mint,
          subscriptionTier: org.subscription_tier,
          settings: org.settings || {},
          createdAt: org.created_at,
        });
      });

      setBlockdriveOrgData(dataMap);
    } catch (err) {
      console.error('[useOrganizations] Error fetching BlockDrive data:', err);
    }
  }, [supabase]);

  // Fetch organization members with BlockDrive extensions
  const fetchMembers = useCallback(async (orgId: string) => {
    if (!supabase || !activeOrg) return;

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_members')
        .select(`
          id,
          clerk_user_id,
          role,
          org_username,
          org_subdomain_nft_id,
          join_method,
          created_at
        `)
        .eq('organization_id', blockdriveData.id);

      if (fetchError) throw fetchError;

      // Merge with Clerk member data
      const clerkMembers = await activeOrg.getMemberships();

      const mergedMembers: OrganizationMember[] = (data || []).map((m: any) => {
        const clerkMember = clerkMembers.data?.find(
          cm => cm.publicUserData?.userId === m.clerk_user_id
        );

        return {
          id: m.id,
          clerkUserId: m.clerk_user_id,
          role: clerkMember?.role || m.role,
          email: clerkMember?.publicUserData?.identifier,
          firstName: clerkMember?.publicUserData?.firstName || undefined,
          lastName: clerkMember?.publicUserData?.lastName || undefined,
          imageUrl: clerkMember?.publicUserData?.imageUrl,
          orgUsername: m.org_username,
          orgSubdomainNftId: m.org_subdomain_nft_id,
          joinMethod: m.join_method,
          joinedAt: m.created_at,
        };
      });

      setMembers(mergedMembers);
    } catch (err) {
      console.error('[useOrganizations] Error fetching members:', err);
    }
  }, [supabase, activeOrg, blockdriveOrgData]);

  // Fetch invite codes for current organization
  const fetchInviteCodes = useCallback(async () => {
    if (!supabase || !activeOrg) return;

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_invite_codes')
        .select('*')
        .eq('organization_id', blockdriveData.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInviteCodes((data || []).map((c: any) => ({
        id: c.id,
        code: c.code,
        maxUses: c.max_uses,
        currentUses: c.current_uses,
        expiresAt: c.expires_at,
        isActive: c.is_active,
        defaultRole: c.default_role,
        createdAt: c.created_at,
      })));
    } catch (err) {
      console.error('[useOrganizations] Error fetching invite codes:', err);
    }
  }, [supabase, activeOrg, blockdriveOrgData]);

  // Fetch email domains for current organization
  const fetchEmailDomains = useCallback(async () => {
    if (!supabase || !activeOrg) return;

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('organization_email_domains')
        .select('*')
        .eq('organization_id', blockdriveData.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setEmailDomains((data || []).map((d: any) => ({
        id: d.id,
        domain: d.domain,
        verifiedAt: d.verified_at,
        autoJoin: d.auto_join,
        defaultRole: d.default_role,
        isPrimary: d.is_primary,
      })));
    } catch (err) {
      console.error('[useOrganizations] Error fetching email domains:', err);
    }
  }, [supabase, activeOrg, blockdriveOrgData]);

  // Create organization (subscription-gated)
  const createOrganization = async (params: {
    name: string;
    subdomain: string;
    subscriptionTier: 'business' | 'enterprise';
  }) => {
    if (!userId || !clerkCreateOrg) {
      throw new Error('Not authenticated');
    }

    try {
      // First create in Clerk
      const clerkOrg = await clerkCreateOrg({ name: params.name });

      // Then create BlockDrive record in Supabase
      const { data, error: insertError } = await supabase
        .from('organizations')
        .insert({
          clerk_org_id: clerkOrg.id,
          name: params.name,
          slug: params.subdomain.toLowerCase(),
          subdomain: params.subdomain.toLowerCase(),
          owner_clerk_id: userId,
          subscription_tier: params.subscriptionTier,
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup: delete from Clerk if Supabase fails
        console.error('[useOrganizations] Supabase insert failed, cleaning up Clerk org');
        throw insertError;
      }

      // Set as active organization
      await setActive?.({ organization: clerkOrg.id });

      toast.success(`Organization "${params.name}" created successfully`);
      return {
        clerkOrgId: clerkOrg.id,
        blockdriveOrgId: data.id,
        subdomain: params.subdomain,
      };
    } catch (err) {
      console.error('[useOrganizations] Error creating organization:', err);
      toast.error('Failed to create organization');
      throw err;
    }
  };

  // Switch active organization
  const switchOrganization = async (orgId: string | null) => {
    try {
      await setActive?.({ organization: orgId });
      if (orgId) {
        toast.success('Switched organization');
      }
    } catch (err) {
      console.error('[useOrganizations] Error switching organization:', err);
      toast.error('Failed to switch organization');
    }
  };

  // Generate invite code
  const generateInviteCode = async (options: {
    maxUses?: number;
    expiresInDays?: number;
    defaultRole?: string;
  } = {}) => {
    if (!activeOrg) {
      throw new Error('No active organization');
    }

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) {
      throw new Error('Organization not found in BlockDrive');
    }

    const token = await getToken();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-org-invite-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          organizationId: blockdriveData.id,
          maxUses: options.maxUses,
          expiresInDays: options.expiresInDays,
          defaultRole: options.defaultRole || 'member',
        }),
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate invite code');
    }

    await fetchInviteCodes();
    toast.success('Invite code generated');

    return result.code;
  };

  // Add email domain
  const addEmailDomain = async (domain: string) => {
    if (!activeOrg || !userId) {
      throw new Error('No active organization');
    }

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) {
      throw new Error('Organization not found in BlockDrive');
    }

    try {
      const { error: insertError } = await supabase
        .from('organization_email_domains')
        .insert({
          organization_id: blockdriveData.id,
          domain: domain.toLowerCase(),
          auto_join: true,
          default_role: 'member',
        });

      if (insertError) throw insertError;

      await fetchEmailDomains();
      toast.success(`Email domain "${domain}" added. Verification pending.`);
    } catch (err) {
      console.error('[useOrganizations] Error adding email domain:', err);
      toast.error('Failed to add email domain');
      throw err;
    }
  };

  // Deactivate invite code
  const deactivateInviteCode = async (codeId: string) => {
    if (!activeOrg) return;

    const blockdriveData = blockdriveOrgData.get(activeOrg.id);
    if (!blockdriveData) return;

    try {
      const { error: updateError } = await supabase
        .from('organization_invite_codes')
        .update({ is_active: false })
        .eq('id', codeId)
        .eq('organization_id', blockdriveData.id);

      if (updateError) throw updateError;

      await fetchInviteCodes();
      toast.success('Invite code deactivated');
    } catch (err) {
      console.error('[useOrganizations] Error deactivating invite code:', err);
      toast.error('Failed to deactivate invite code');
    }
  };

  // Get combined organization list
  const organizations: Organization[] = (organizationList || []).map(({ organization, membership }) => {
    const blockdriveData = blockdriveOrgData.get(organization.id);

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      imageUrl: organization.imageUrl,
      membersCount: organization.membersCount || 0,
      role: membership.role,
      subdomain: blockdriveData?.subdomain,
      snsDomain: blockdriveData?.subdomain
        ? `${blockdriveData.subdomain}.blockdrive.sol`
        : undefined,
      subscriptionTier: blockdriveData?.subscriptionTier,
      hasSubdomainNft: !!blockdriveData?.orgNftMint,
    };
  });

  // Current organization with BlockDrive data
  const currentOrganization: Organization | null = activeOrg ? {
    id: activeOrg.id,
    name: activeOrg.name,
    slug: activeOrg.slug,
    imageUrl: activeOrg.imageUrl,
    membersCount: activeOrg.membersCount || 0,
    role: activeMembership?.role || 'member',
    subdomain: blockdriveOrgData.get(activeOrg.id)?.subdomain,
    snsDomain: blockdriveOrgData.get(activeOrg.id)?.subdomain
      ? `${blockdriveOrgData.get(activeOrg.id)!.subdomain}.blockdrive.sol`
      : undefined,
    subscriptionTier: blockdriveOrgData.get(activeOrg.id)?.subscriptionTier,
    hasSubdomainNft: !!blockdriveOrgData.get(activeOrg.id)?.orgNftMint,
  } : null;

  // Check if user can manage organization (admin or owner)
  const canManageOrganization = activeMembership?.role === 'admin' ||
                                 activeMembership?.role === 'org:admin';

  // Effects
  useEffect(() => {
    if (listLoaded && organizationList) {
      const clerkOrgIds = organizationList.map(m => m.organization.id);
      fetchBlockDriveOrgData(clerkOrgIds).finally(() => setLoading(false));
    }
  }, [listLoaded, organizationList, fetchBlockDriveOrgData]);

  useEffect(() => {
    if (activeOrg && blockdriveOrgData.has(activeOrg.id)) {
      fetchMembers(activeOrg.id);
      fetchInviteCodes();
      fetchEmailDomains();
    }
  }, [activeOrg, blockdriveOrgData, fetchMembers, fetchInviteCodes, fetchEmailDomains]);

  return {
    // Organization data
    organizations,
    currentOrganization,
    members,
    inviteCodes,
    emailDomains,

    // Loading states
    loading: !orgLoaded || !listLoaded || loading,
    error,

    // Permissions
    canManageOrganization,

    // Actions
    createOrganization,
    switchOrganization,
    generateInviteCode,
    addEmailDomain,
    deactivateInviteCode,

    // Refresh functions
    refreshMembers: () => activeOrg && fetchMembers(activeOrg.id),
    refreshInviteCodes: fetchInviteCodes,
    refreshEmailDomains: fetchEmailDomains,
  };
};
