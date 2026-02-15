import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startRegistration } from '@simplewebauthn/browser';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, CheckCircle2, XCircle, AlertTriangle, Smartphone } from 'lucide-react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

type VerifyStatus = 'loading' | 'ready' | 'verifying' | 'registering' | 'success' | 'error';

export default function WebAuthnMobileVerify() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sid');
  const emailToken = searchParams.get('token');
  const { authenticateForSession, error, clearError } = useWebAuthnAuthentication();
  const { supabase } = useClerkAuth();
  const cleanupRef = useRef<Array<() => void>>([]);

  // Clean up any pending timeouts/channels on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(fn => fn());
    };
  }, []);
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [localError, setLocalError] = useState<string | null>(null);
  const [broadcastFailed, setBroadcastFailed] = useState(false);

  // Validate that we have either a session ID or email token
  useEffect(() => {
    if (!sessionId && !emailToken) {
      setStatus('error');
    } else {
      setStatus('ready');
    }
  }, [sessionId, emailToken]);

  /** Broadcast the assertion token back to the desktop (QR flow) or original tab (email flow) */
  const broadcastResult = async (assertionToken: string) => {
    let notifyFailed = false;

    if (sessionId) {
      try {
        const channel = supabase.channel(`webauthn:${sessionId}`);
        await channel.subscribe();
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload: {
            event: 'auth_completed',
            assertionToken,
          },
        });
        const t = setTimeout(() => channel.unsubscribe(), 2000);
        cleanupRef.current.push(
          () => { clearTimeout(t); channel.unsubscribe(); }
        );
      } catch (err) {
        console.error('Failed to broadcast auth result:', err);
        notifyFailed = true;
      }
    }

    if (emailToken) {
      try {
        const bc = new BroadcastChannel('blockdrive-webauthn');
        bc.postMessage({
          event: 'auth_completed',
          assertionToken,
        });
        const t = setTimeout(() => bc.close(), 2000);
        cleanupRef.current.push(
          () => { clearTimeout(t); bc.close(); }
        );
      } catch (err) {
        console.warn('BroadcastChannel not available:', err);
        notifyFailed = true;
      }
    }

    setBroadcastFailed(notifyFailed);
    setStatus('success');
  };

  const handleVerify = async () => {
    setStatus('verifying');
    clearError();
    setLocalError(null);

    // ── QR flow: try registration first, fall back to authentication ──
    // On first use, the phone has no credential for blockdrive.co.
    // We register one using the phone's fingerprint, then get an assertion token.
    // On subsequent uses, registration fails (credential already exists) and we
    // fall back to standard authentication. We fall through on ANY registration
    // error except explicit user cancellation, because Android devices sometimes
    // throw unexpected errors instead of the standard InvalidStateError.
    if (sessionId) {
      let shouldTryAuth = false;

      // Step 1: Try to register a new credential on this device
      try {
        const { data: regOptions, error: regOptionsErr } = await supabase.functions.invoke(
          'webauthn-registration',
          { body: { action: 'generate-options-for-session', session_id: sessionId } }
        );

        if (regOptionsErr || !regOptions?.success) {
          throw new Error(regOptions?.error || 'Failed to get registration options');
        }

        setStatus('registering');
        const attResp = await startRegistration({ optionsJSON: regOptions.options });

        // Verify registration and get assertion token
        const { data: regVerify, error: regVerifyErr } = await supabase.functions.invoke(
          'webauthn-registration',
          { body: { action: 'verify-registration-for-session', session_id: sessionId, attestation: attResp } }
        );

        if (regVerifyErr || !regVerify?.success) {
          throw new Error(regVerify?.error || 'Registration verification failed');
        }

        // Registration succeeded — broadcast assertion token to desktop
        await broadcastResult(regVerify.assertion_token);
        return;
      } catch (regErr) {
        const msg = regErr instanceof Error ? regErr.message : String(regErr);

        // Only stop on explicit user cancellation — all other errors (InvalidStateError,
        // credential manager errors, Android quirks) fall through to authentication
        if (msg.includes('NotAllowedError') || msg.includes('cancelled')) {
          setLocalError('Biometric was cancelled. Please try again.');
          setStatus('error');
          return;
        }

        // Registration failed for non-cancellation reason → try authentication
        shouldTryAuth = true;
      }

      // Step 2: Registration failed — device likely already has a credential
      if (shouldTryAuth) {
        setStatus('verifying');
        clearError();
        setLocalError(null);
        const result = await authenticateForSession(sessionId);

        if (result?.success) {
          await broadcastResult(result.assertionToken);
          return;
        }

        setLocalError(error || 'Verification failed. Please try again.');
        setStatus('error');
        return;
      }
    }

    // ── Email token flow: authenticate directly (same device, credential exists) ──
    if (emailToken) {
      const result = await authenticateForSession(undefined, emailToken);

      if (result?.success) {
        await broadcastResult(result.assertionToken);
        return;
      }

      setStatus('error');
      return;
    }

    setStatus('error');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">BlockDrive Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">Biometric Verification</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Preparing verification...</p>
            </div>
          )}

          {status === 'ready' && (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Fingerprint className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {sessionId
                    ? 'Tap below to verify with your fingerprint and unlock your desktop session.'
                    : 'Tap below to verify with your biometric and unlock your encryption keys.'}
                </p>
              </div>

              <Button onClick={handleVerify} className="w-full h-14 text-base">
                <Fingerprint className="w-5 h-5 mr-2" />
                Verify with Fingerprint
              </Button>
            </>
          )}

          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Waiting for biometric...</p>
            </div>
          )}

          {status === 'registering' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Smartphone className="w-8 h-8 text-primary animate-pulse" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Setting up fingerprint</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use your fingerprint to link this device to your vault.
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              {broadcastFailed ? (
                <AlertTriangle className="w-12 h-12 text-yellow-500" />
              ) : (
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              )}
              <div className="text-center">
                <p className="font-medium text-foreground">
                  {broadcastFailed ? 'Verification Complete — Manual Refresh Needed' : 'Verification Complete'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {broadcastFailed
                    ? 'Your identity was verified, but we could not notify the other tab automatically. Please go back to the BlockDrive tab and refresh the page.'
                    : sessionId
                      ? 'Your desktop session has been unlocked. You can close this tab.'
                      : 'Your encryption keys are being derived. You can close this tab.'}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="w-12 h-12 text-destructive" />
              <div className="text-center">
                <p className="font-medium text-foreground">Verification Failed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {displayError || (!sessionId && !emailToken
                    ? 'Invalid verification link. Please try again from BlockDrive.'
                    : 'Something went wrong. Please try again.')}
                </p>
              </div>
              {(sessionId || emailToken) && (
                <Button variant="outline" onClick={handleVerify}>
                  Try Again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
