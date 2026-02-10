import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { useWebAuthnRegistration } from '@/hooks/useWebAuthnRegistration';
import { WebAuthnSetup } from './WebAuthnSetup';
import { WebAuthnVerify } from './WebAuthnVerify';
import { SecurityQuestionSetup } from './SecurityQuestionSetup';
import { SecurityQuestionVerify } from './SecurityQuestionVerify';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import type { CryptoFlowStep } from '@/types/webauthn';

interface CryptoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function CryptoSetupModal({ isOpen, onClose, onComplete }: CryptoSetupModalProps) {
  const { state, initializeKeys } = useWalletCrypto();
  const { hasCredentials } = useWebAuthnRegistration();
  const { supabase } = useClerkAuth();

  const [step, setStep] = useState<CryptoFlowStep>('loading');
  const [questionText, setQuestionText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleWebAuthnVerified = useCallback(async (assertionToken: string) => {
    if (!assertionToken?.trim()) {
      setError('Invalid verification token');
      setStep('verify-biometric');
      return;
    }

    setStep('deriving');
    setError(null);

    const success = await initializeKeys(undefined, assertionToken);
    if (success) {
      onComplete();
    } else {
      setError(state.error || 'Biometric verification succeeded but key derivation failed');
      setStep('verify-biometric');
    }
  }, [initializeKeys, onComplete, state.error]);

  const handleWebAuthnSetupComplete = () => {
    setStep('verify-biometric');
  };

  // Short-circuit: if keys are already initialized (e.g. auto-restored from
  // sessionStorage), immediately complete without prompting again.
  useEffect(() => {
    if (!isOpen) return;
    if (state.isInitialized) {
      onComplete();
    }
  }, [isOpen, state.isInitialized, onComplete]);

  const [broadcastAvailable, setBroadcastAvailable] = useState(true);

  // Listen for BroadcastChannel messages (email fallback flow from another tab)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const bc = new BroadcastChannel('blockdrive-webauthn');
      bc.onmessage = (event) => {
        if (event.data?.event === 'auth_completed' && event.data?.assertionToken) {
          handleWebAuthnVerified(event.data.assertionToken);
        }
      };
      setBroadcastAvailable(true);
      return () => bc.close();
    } catch {
      // BroadcastChannel not supported — email fallback auto-unlock won't work
      setBroadcastAvailable(false);
      console.warn('[CryptoSetupModal] BroadcastChannel not available — email auto-unlock disabled');
    }
  }, [isOpen, handleWebAuthnVerified]);

  // Determine flow when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (state.isInitialized) return;

    setError(null);

    const determineFlow = async () => {
      setStep('loading');
      try {
        // Check if user has WebAuthn credentials (new flow)
        const hasWebAuthn = await hasCredentials();

        if (hasWebAuthn) {
          setStep('verify-biometric');
          return;
        }

        // Check if user has a legacy security question
        const { data, error: fnError } = await supabase.functions.invoke('security-question', {
          body: { action: 'get' },
        });

        if (fnError) throw new Error(fnError.message);

        if (data?.hasQuestion) {
          // Legacy user with security question — show biometric setup prompt
          // They'll set up biometrics, then verify
          setQuestionText(data.question);
          setStep('setup-biometric');
          return;
        }

        // New user — set up biometrics directly
        setStep('setup-biometric');
      } catch (err) {
        console.error('[CryptoSetupModal] Failed to determine flow:', err);
        setError('Unable to check your encryption status. Please check your connection and try again.');
        setStep('loading'); // Will show error with retry button
      }
    };

    determineFlow();
  }, [isOpen, supabase, state.isInitialized, hasCredentials]);

  // Legacy handlers (for users who haven't migrated yet)
  const handleLegacySetupComplete = async () => {
    try {
      const { data } = await supabase.functions.invoke('security-question', {
        body: { action: 'get' },
      });
      if (data?.question) {
        setQuestionText(data.question);
      }
    } catch {
      // Non-critical
    }
    setStep('legacy-verify');
  };

  const handleLegacyVerified = async (answerHash: string) => {
    setStep('deriving');
    setError(null);

    const success = await initializeKeys(answerHash);
    if (success) {
      onComplete();
    } else {
      setError(state.error || 'Incorrect answer or key derivation failed');
      setStep('legacy-verify');
    }
  };

  const getTitle = () => {
    if (step === 'setup-biometric') return 'Set Up Biometric Unlock';
    if (step === 'legacy-setup') return 'Set Up Encryption';
    return 'Unlock Your Encryption';
  };

  const getDescription = () => {
    if (step === 'setup-biometric') {
      return 'Register your biometric (fingerprint, face, or PIN) to protect your encryption keys.';
    }
    if (step === 'verify-biometric' || step === 'verify-qr' || step === 'verify-email-sent') {
      return 'Verify your identity to derive your encryption keys. Keys never leave your device.';
    }
    return 'Your keys are derived from your verification and never leave your device.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="w-5 h-5 text-primary" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'loading' && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {step === 'loading' && error && (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground text-center">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep('loading');
                  // Re-trigger determineFlow by toggling a counter
                  // The useEffect depends on isOpen/state.isInitialized/hasCredentials
                  // which haven't changed, so we manually retry
                  (async () => {
                    try {
                      const hasWebAuthn = await hasCredentials();
                      if (hasWebAuthn) { setStep('verify-biometric'); return; }
                      const { data, error: fnError } = await supabase.functions.invoke('security-question', {
                        body: { action: 'get' },
                      });
                      if (fnError) throw new Error(fnError.message);
                      if (data?.hasQuestion) { setQuestionText(data.question); setStep('setup-biometric'); return; }
                      setStep('setup-biometric');
                    } catch (err) {
                      console.error('[CryptoSetupModal] Retry failed:', err);
                      setError('Still unable to connect. Please check your network and try again.');
                    }
                  })();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}

          {step === 'setup-biometric' && (
            <WebAuthnSetup onComplete={handleWebAuthnSetupComplete} />
          )}

          {step === 'verify-biometric' && (
            <WebAuthnVerify
              onVerified={handleWebAuthnVerified}
              error={error}
            />
          )}

          {step === 'legacy-setup' && (
            <SecurityQuestionSetup onComplete={handleLegacySetupComplete} />
          )}

          {step === 'legacy-verify' && (
            <SecurityQuestionVerify
              question={questionText}
              onVerified={handleLegacyVerified}
              error={error}
            />
          )}

          {step === 'deriving' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Deriving encryption keys...</p>
            </div>
          )}
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-2">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Your biometric verifies your identity server-side</li>
            <li>Keys are derived client-side and never transmitted</li>
            <li>Files are encrypted with AES-256-GCM before upload</li>
            <li>Only you can decrypt your files</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
