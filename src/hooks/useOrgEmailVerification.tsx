/**
 * useOrgEmailVerification Hook
 *
 * Handles business email domain verification during onboarding.
 * Flow:
 * 1. User enters business email (e.g., sean@blockdrive.co)
 * 2. System checks if email domain is registered with an organization
 * 3. If match found, sends magic link to verify ownership
 * 4. User clicks magic link, gets added to organization
 * 5. Returns organization context for subdomain NFT minting
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/clerk-react';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

// Constants
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const RESEND_COOLDOWN_SECONDS = 60;
const BLOCKDRIVE_DOMAIN_SUFFIX = '.blockdrive.sol';

// Result when checking if email domain matches an organization
export interface EmailCheckResult {
  hasOrganization: boolean;
  organization?: {
    id: string;
    clerkOrgId: string;
    name: string;
    subdomain: string;
    imageUrl?: string;
  };
  requiresVerification: boolean;
  error?: string;
}

// Result when sending verification email
export interface SendVerificationResult {
  success: boolean;
  organizationName?: string;
  message?: string;
  error?: string;
}

// Result when verifying token from magic link
export interface VerifyTokenResult {
  success: boolean;
  verified: boolean;
  organization?: {
    id: string;
    clerkOrgId: string;
    name: string;
    subdomain: string;
  };
  defaultRole?: string;
  error?: string;
}

// Organization context for downstream use
export interface OrganizationContext {
  id: string;
  clerkOrgId: string;
  name: string;
  subdomain: string;
  role: string;
  snsDomain: string;
}

export type VerificationStatus = 'idle' | 'checking' | 'found' | 'sending' | 'pending' | 'verifying' | 'verified' | 'error';

export const useOrgEmailVerification = () => {
  const { userId, supabase } = useClerkAuth();
  const { getToken } = useAuth();
  const { setActive } = useOrganizationList();

  // State
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [email, setEmail] = useState<string>('');
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [organization, setOrganization] = useState<OrganizationContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationSentAt, setVerificationSentAt] = useState<Date | null>(null);

  /**
   * Check if email domain matches an organization
   */
  const checkEmail = useCallback(async (emailAddress: string): Promise<EmailCheckResult> => {
    if (!emailAddress || !emailAddress.includes('@')) {
      return { hasOrganization: false, requiresVerification: false, error: 'Invalid email format' };
    }

    setStatus('checking');
    setEmail(emailAddress);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-email-org-membership`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email: emailAddress.toLowerCase().trim() }),
        }
      );

      const result = await response.json();

      const checkResult: EmailCheckResult = {
        hasOrganization: result.hasOrganization === true,
        organization: result.organization ? {
          id: result.organization.id,
          clerkOrgId: result.organization.clerkOrgId,
          name: result.organization.name,
          subdomain: result.organization.subdomain,
          imageUrl: result.organization.imageUrl,
        } : undefined,
        requiresVerification: result.requiresVerification === true,
        error: result.error,
      };

      setEmailCheckResult(checkResult);

      if (checkResult.hasOrganization) {
        setStatus('found');
      } else {
        setStatus('idle');
      }

      return checkResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check email';
      setError(errorMessage);
      setStatus('error');
      return { hasOrganization: false, requiresVerification: false, error: errorMessage };
    }
  }, []);

  /**
   * Send verification email (magic link)
   */
  const sendVerification = useCallback(async (emailAddress?: string): Promise<SendVerificationResult> => {
    const targetEmail = emailAddress || email;

    if (!targetEmail) {
      return { success: false, error: 'No email address provided' };
    }

    setStatus('sending');
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-org-email-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: targetEmail.toLowerCase().trim(),
            redirectUrl: `${window.location.origin}/verify-org-email`,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to send verification email');
        setStatus('error');
        return {
          success: false,
          error: result.error || 'Failed to send verification email',
        };
      }

      setVerificationSentAt(new Date());
      setStatus('pending');

      return {
        success: true,
        organizationName: result.organizationName,
        message: result.message,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification';
      setError(errorMessage);
      setStatus('error');
      return { success: false, error: errorMessage };
    }
  }, [email]);

  /**
   * Verify token from magic link
   * Called when user clicks the verification link
   */
  const verifyToken = useCallback(async (token: string): Promise<VerifyTokenResult> => {
    if (!token) {
      return { success: false, verified: false, error: 'No token provided' };
    }

    setStatus('verifying');
    setError(null);

    try {
      const authToken = userId ? await getToken() : null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-org-email-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            token,
            clerkUserId: userId || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!result.success || !result.verified) {
        setError(result.error || 'Verification failed');
        setStatus('error');
        return {
          success: false,
          verified: false,
          error: result.error || 'Verification failed',
        };
      }

      // Set organization context
      if (result.organization) {
        const orgContext: OrganizationContext = {
          id: result.organization.id,
          clerkOrgId: result.organization.clerkOrgId,
          name: result.organization.name,
          subdomain: result.organization.subdomain,
          role: result.defaultRole || 'member',
          snsDomain: `${result.organization.subdomain}${BLOCKDRIVE_DOMAIN_SUFFIX}`,
        };
        setOrganization(orgContext);

        // Set as active organization in Clerk
        if (result.organization.clerkOrgId && setActive) {
          try {
            await setActive({ organization: result.organization.clerkOrgId });
          } catch (clerkErr) {
            console.warn('[useOrgEmailVerification] Failed to set active org in Clerk:', clerkErr);
          }
        }
      }

      setStatus('verified');

      return {
        success: true,
        verified: true,
        organization: result.organization,
        defaultRole: result.defaultRole,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      setError(errorMessage);
      setStatus('error');
      return { success: false, verified: false, error: errorMessage };
    }
  }, [userId, getToken, setActive]);

  /**
   * Resend verification email
   * Only allowed after cooldown period
   */
  const resendVerification = useCallback(async (): Promise<SendVerificationResult> => {
    if (!email) {
      return { success: false, error: 'No email address set' };
    }

    // Check cooldown
    if (verificationSentAt) {
      const elapsed = Date.now() - verificationSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          success: false,
          error: `Please wait ${remainingSeconds} seconds before resending`,
        };
      }
    }

    return sendVerification(email);
  }, [email, verificationSentAt, sendVerification]);

  /**
   * Extract domain from email address
   */
  const getEmailDomain = useCallback((emailAddress: string): string | null => {
    if (!emailAddress || !emailAddress.includes('@')) return null;
    return emailAddress.split('@')[1].toLowerCase();
  }, []);

  /**
   * Check if resend is available (cooldown expired)
   */
  const canResend = useCallback((): boolean => {
    if (!verificationSentAt) return true;
    return Date.now() - verificationSentAt.getTime() >= RESEND_COOLDOWN_MS;
  }, [verificationSentAt]);

  /**
   * Get remaining cooldown seconds
   */
  const getResendCooldown = useCallback((): number => {
    if (!verificationSentAt) return 0;
    const elapsed = Date.now() - verificationSentAt.getTime();
    return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000));
  }, [verificationSentAt]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setEmail('');
    setEmailCheckResult(null);
    setOrganization(null);
    setError(null);
    setVerificationSentAt(null);
  }, []);

  // Auto-check for verification token in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token && window.location.pathname === '/verify-org-email') {
      verifyToken(token);
    }
  }, [verifyToken]);

  return {
    // State
    status,
    email,
    emailCheckResult,
    organization,
    error,
    verificationSentAt,

    // Loading states
    isChecking: status === 'checking',
    isSending: status === 'sending',
    isVerifying: status === 'verifying',
    isPending: status === 'pending',
    isVerified: status === 'verified',
    isLoading: ['checking', 'sending', 'verifying'].includes(status),

    // Actions
    checkEmail,
    sendVerification,
    verifyToken,
    resendVerification,
    reset,

    // Utilities
    getEmailDomain,
    canResend,
    getResendCooldown,
  };
};
