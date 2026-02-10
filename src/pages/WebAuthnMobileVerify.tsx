import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Fingerprint, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

type VerifyStatus = 'loading' | 'ready' | 'verifying' | 'success' | 'error';

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
  const [assertionToken, setAssertionToken] = useState<string | null>(null);

  // Validate that we have either a session ID or email token
  useEffect(() => {
    if (!sessionId && !emailToken) {
      setStatus('error');
    } else {
      setStatus('ready');
    }
  }, [sessionId, emailToken]);

  const handleVerify = async () => {
    setStatus('verifying');
    clearError();

    const result = await authenticateForSession(
      sessionId || undefined,
      emailToken || undefined
    );

    if (result?.success) {
      setAssertionToken(result.assertionToken);

      // If this is a QR flow (sessionId), broadcast the result via Realtime
      if (sessionId) {
        try {
          const channel = supabase.channel(`webauthn:${sessionId}`);
          await channel.subscribe();
          await channel.send({
            type: 'broadcast',
            event: 'message',
            payload: {
              event: 'auth_completed',
              assertionToken: result.assertionToken,
            },
          });
          // Give the message time to propagate before unsubscribing
          const t = setTimeout(() => channel.unsubscribe(), 2000);
          cleanupRef.current.push(
            () => { clearTimeout(t); channel.unsubscribe(); }
          );
        } catch (err) {
          console.error('Failed to broadcast auth result:', err);
        }
      }

      // If this is an email flow, signal the original tab via BroadcastChannel
      if (emailToken) {
        try {
          const bc = new BroadcastChannel('blockdrive-webauthn');
          bc.postMessage({
            event: 'auth_completed',
            assertionToken: result.assertionToken,
          });
          const t = setTimeout(() => bc.close(), 2000);
          cleanupRef.current.push(
            () => { clearTimeout(t); bc.close(); }
          );
        } catch {
          // BroadcastChannel not available — user will need to refresh original tab
        }
      }

      setStatus('success');
    } else {
      setStatus('error');
    }
  };

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
                    ? 'Tap below to verify with your biometric and unlock your desktop session.'
                    : 'Tap below to verify with your biometric and unlock your encryption keys.'}
                </p>
              </div>

              <Button onClick={handleVerify} className="w-full h-14 text-base">
                <Fingerprint className="w-5 h-5 mr-2" />
                Verify Now
              </Button>
            </>
          )}

          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Waiting for biometric...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div className="text-center">
                <p className="font-medium text-foreground">Verification Complete</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sessionId
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
                  {error || (!sessionId && !emailToken
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
