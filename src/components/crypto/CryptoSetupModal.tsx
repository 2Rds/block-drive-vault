import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Key, Loader2 } from 'lucide-react';
import { useWalletCrypto } from '@/hooks/useWalletCrypto';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { SecurityQuestionSetup } from './SecurityQuestionSetup';
import { SecurityQuestionVerify } from './SecurityQuestionVerify';

interface CryptoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type FlowStep = 'loading' | 'setup' | 'verify' | 'deriving';

export function CryptoSetupModal({ isOpen, onClose, onComplete }: CryptoSetupModalProps) {
  const { state, initializeKeys } = useWalletCrypto();
  const { supabase } = useClerkAuth();

  const [step, setStep] = useState<FlowStep>('loading');
  const [questionText, setQuestionText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check if user has a security question when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    const checkQuestion = async () => {
      setStep('loading');
      try {
        const { data, error: fnError } = await supabase.functions.invoke('security-question', {
          body: { action: 'get' },
        });

        if (fnError) throw new Error(fnError.message);

        if (data?.hasQuestion) {
          setQuestionText(data.question);
          setStep('verify');
        } else {
          setStep('setup');
        }
      } catch {
        // If we can't reach the function, default to setup
        setStep('setup');
      }
    };

    checkQuestion();
  }, [isOpen, supabase]);

  const handleSetupComplete = async () => {
    // After setup, fetch the question and move to verify
    try {
      const { data } = await supabase.functions.invoke('security-question', {
        body: { action: 'get' },
      });
      if (data?.question) {
        setQuestionText(data.question);
      }
    } catch {
      // Non-critical — question text may not refresh
    }
    setStep('verify');
  };

  const handleVerified = async (answerHash: string) => {
    setStep('deriving');
    setError(null);

    const success = await initializeKeys(answerHash);
    if (success) {
      onComplete();
    } else {
      setError(state.error || 'Incorrect answer or key derivation failed');
      setStep('verify');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Key className="w-5 h-5 text-primary" />
            {step === 'setup' ? 'Set Up Encryption' : 'Unlock Your Encryption'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 'setup'
              ? 'Choose a security question to protect your encryption keys.'
              : 'Your keys are derived from your security answer and never leave your device.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'loading' && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {step === 'setup' && (
            <SecurityQuestionSetup onComplete={handleSetupComplete} />
          )}

          {step === 'verify' && (
            <SecurityQuestionVerify
              question={questionText}
              onVerified={handleVerified}
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
            <li>Your answer is verified server-side to unlock key material</li>
            <li>Keys are derived client-side and never transmitted</li>
            <li>Files are encrypted with AES-256-GCM before upload</li>
            <li>Only you can decrypt your files</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
