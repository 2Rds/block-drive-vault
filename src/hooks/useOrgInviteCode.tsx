/**
 * useOrgInviteCode Hook
 *
 * Handles organization invite code validation and usage during onboarding.
 * Integrates with Clerk Organizations and BlockDrive's Supabase infrastructure.
 *
 * Flow:
 * 1. User enters invite code during onboarding
 * 2. Code is validated against Supabase (organization_invite_codes)
 * 3. On use, user is added to both Clerk org and Supabase org_members
 * 4. Returns organization context for subdomain NFT minting
 */

import { useState, useCallback } from 'react';
import { useAuth, useOrganizationList } from '@clerk/clerk-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

// Validation result when checking a code
export interface InviteCodeValidationResult {
  valid: boolean;
  organization?: {
    id: string;
    clerkOrgId: string;
    name: string;
    subdomain: string;
    imageUrl?: string;
  };
  defaultRole?: string;
  expiresAt?: string;
  remainingUses?: number;
  error?: string;
}

// Result when using/redeeming a code
export interface UseCodeResult {
  success: boolean;
  organizationId?: string;
  clerkOrgId?: string;
  subdomain?: string;
  role?: string;
  error?: string;
}

// Organization context for downstream use (e.g., NFT minting)
export interface OrganizationContext {
  id: string;
  clerkOrgId: string;
  name: string;
  subdomain: string;
  role: string;
  snsDomain: string; // e.g., "acme.blockdrive.sol"
}

export const useOrgInviteCode = () => {
  const { userId, supabase } = useClerkAuth();
  const { getToken } = useAuth();
  const { setActive } = useOrganizationList();

  // State
  const [isValidating, setIsValidating] = useState(false);
  const [isUsing, setIsUsing] = useState(false);
  const [validationResult, setValidationResult] = useState<InviteCodeValidationResult | null>(null);
  const [organization, setOrganization] = useState<OrganizationContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Validate an invite code without using it
   * Used for real-time feedback as user types
   */
  const validateCode = useCallback(async (code: string): Promise<InviteCodeValidationResult> => {
    if (!code || code.length < 6) {
      return { valid: false, error: 'Code is too short' };
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-org-invite-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ code: code.toUpperCase().trim() }),
        }
      );

      const result = await response.json();

      const validationResult: InviteCodeValidationResult = {
        valid: result.valid === true,
        organization: result.organization ? {
          id: result.organization.id,
          clerkOrgId: result.organization.clerkOrgId,
          name: result.organization.name,
          subdomain: result.organization.subdomain,
          imageUrl: result.organization.imageUrl,
        } : undefined,
        defaultRole: result.defaultRole,
        expiresAt: result.expiresAt,
        remainingUses: result.remainingUses,
        error: result.error,
      };

      setValidationResult(validationResult);
      return validationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate code';
      setError(errorMessage);
      const result = { valid: false, error: errorMessage };
      setValidationResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  /**
   * Use/redeem an invite code
   * Adds user to the organization in both Clerk and Supabase
   */
  const useCode = useCallback(async (code: string): Promise<UseCodeResult> => {
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsUsing(true);
    setError(null);

    try {
      // Get auth token for the request
      const token = await getToken();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/use-org-invite-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            code: code.toUpperCase().trim(),
            clerkUserId: userId,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to use invite code');
        return {
          success: false,
          error: result.error || 'Failed to use invite code',
        };
      }

      // Set organization context for downstream use
      if (result.organization) {
        const orgContext: OrganizationContext = {
          id: result.organization.id,
          clerkOrgId: result.organization.clerkOrgId,
          name: result.organization.name,
          subdomain: result.organization.subdomain,
          role: result.role || 'member',
          snsDomain: `${result.organization.subdomain}.blockdrive.sol`,
        };
        setOrganization(orgContext);

        // Set as active organization in Clerk
        if (result.organization.clerkOrgId && setActive) {
          try {
            await setActive({ organization: result.organization.clerkOrgId });
          } catch (clerkErr) {
            console.warn('[useOrgInviteCode] Failed to set active org in Clerk:', clerkErr);
          }
        }
      }

      return {
        success: true,
        organizationId: result.organization?.id,
        clerkOrgId: result.organization?.clerkOrgId,
        subdomain: result.organization?.subdomain,
        role: result.role,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to use invite code';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUsing(false);
    }
  }, [userId, getToken, setActive]);

  /**
   * Format invite code for display (add dashes if needed)
   * Input: "ACME2026X7K9M2" -> Output: "ACME-2026-X7K9M2"
   */
  const formatCode = useCallback((code: string): string => {
    const cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // If already has format markers, return as-is
    if (cleaned.length <= 4) return cleaned;

    // Try to match pattern: PREFIX-YEAR-RANDOM
    // E.g., ACME-2026-X7K9M2
    const prefixMatch = cleaned.match(/^([A-Z]+)(\d{4})([A-Z0-9]+)$/);
    if (prefixMatch) {
      return `${prefixMatch[1]}-${prefixMatch[2]}-${prefixMatch[3]}`;
    }

    return cleaned;
  }, []);

  /**
   * Reset state (e.g., when user cancels or goes back)
   */
  const reset = useCallback(() => {
    setValidationResult(null);
    setOrganization(null);
    setError(null);
    setIsValidating(false);
    setIsUsing(false);
  }, []);

  return {
    // State
    isValidating,
    isUsing,
    isLoading: isValidating || isUsing,
    validationResult,
    organization,
    error,

    // Actions
    validateCode,
    useCode,
    formatCode,
    reset,
  };
};
