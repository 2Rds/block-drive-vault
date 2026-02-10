import { useState, useCallback } from 'react';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import type { WebAuthnVerificationResult } from '@/types/webauthn';

export function useWebAuthnAuthentication() {
  const { supabase } = useClerkAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = browserSupportsWebAuthn();

  /**
   * Direct WebAuthn authentication on current device.
   * Returns an assertion_token that replaces answer_hash for derive-key-material.
   */
  const authenticate = useCallback(async (): Promise<WebAuthnVerificationResult | null> => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // 1. Get authentication challenge from server
      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke(
        'webauthn-authentication',
        { body: { action: 'generate-challenge' } }
      );

      if (challengeErr) throw new Error(challengeErr.message);
      if (!challengeData?.success) throw new Error(challengeData?.error || 'Failed to get challenge');

      // 2. Trigger browser WebAuthn (OS-native biometric prompt)
      const authResp = await startAuthentication({ optionsJSON: challengeData.options });

      // 3. Verify assertion with server
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
        'webauthn-authentication',
        { body: { action: 'verify-assertion', assertion: authResp } }
      );

      if (verifyErr) throw new Error(verifyErr.message);
      if (!verifyData?.success) throw new Error(verifyData?.error || 'Authentication failed');

      return {
        success: true,
        assertionToken: verifyData.assertion_token,
        credentialId: verifyData.credential_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        setError('Biometric authentication was cancelled. Please try again.');
      } else {
        setError(message);
      }
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [supabase]);

  /**
   * Start a QR flow session (desktop creates challenge + session_id).
   * Returns QR URL and session info for Realtime subscription.
   */
  const startQRSession = useCallback(async () => {
    setError(null);

    try {
      const { data, error: err } = await supabase.functions.invoke(
        'webauthn-authentication',
        { body: { action: 'generate-challenge', create_session: true } }
      );

      if (err) throw new Error(err.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to create QR session');

      return {
        sessionId: data.session_id as string,
        qrUrl: data.qr_url as string,
        options: data.options,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start QR session');
      return null;
    }
  }, [supabase]);

  /**
   * Complete authentication for a session (mobile side of QR flow).
   * Also used for email token flow.
   */
  const authenticateForSession = useCallback(async (
    sessionId?: string,
    emailToken?: string
  ): Promise<WebAuthnVerificationResult | null> => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // 1. Get challenge for this session/token
      const { data: challengeData, error: challengeErr } = await supabase.functions.invoke(
        'webauthn-authentication',
        { body: { action: 'get-session-challenge', session_id: sessionId, email_token: emailToken } }
      );

      if (challengeErr) throw new Error(challengeErr.message);
      if (!challengeData?.success) throw new Error(challengeData?.error || 'Failed to get session challenge');

      // 2. Trigger browser WebAuthn
      const authResp = await startAuthentication({ optionsJSON: challengeData.options });

      // 3. Verify assertion
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
        'webauthn-authentication',
        { body: { action: 'verify-assertion', assertion: authResp, session_id: sessionId } }
      );

      if (verifyErr) throw new Error(verifyErr.message);
      if (!verifyData?.success) throw new Error(verifyData?.error || 'Verification failed');

      return {
        success: true,
        assertionToken: verifyData.assertion_token,
        credentialId: verifyData.credential_id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      return null;
    } finally {
      setIsAuthenticating(false);
    }
  }, [supabase]);

  /**
   * Send email fallback link.
   */
  const sendEmailFallback = useCallback(async (): Promise<string | null> => {
    setError(null);

    try {
      const { data, error: err } = await supabase.functions.invoke(
        'webauthn-email-fallback',
        { body: { action: 'send-link' } }
      );

      if (err) throw new Error(err.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to send email');

      return data.email as string; // masked email
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
      return null;
    }
  }, [supabase]);

  return {
    authenticate,
    startQRSession,
    authenticateForSession,
    sendEmailFallback,
    isAuthenticating,
    error,
    isSupported,
    clearError: () => setError(null),
  };
}
