import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';

interface WebAuthnEmailFallbackProps {
  // onComplete is handled via BroadcastChannel from the verification tab
  onComplete: (assertionToken: string) => void;
  onBack: () => void;
}

export function WebAuthnEmailFallback({ onBack }: WebAuthnEmailFallbackProps) {
  const { sendEmailFallback, error, clearError } = useWebAuthnAuthentication();
  const [isSending, setIsSending] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    clearError();
    const email = await sendEmailFallback();
    if (email) {
      setSentEmail(email);
    }
    setIsSending(false);
  };

  // After email is sent, user clicks the link which opens /verify?token=...
  // That page completes WebAuthn and broadcasts the assertion token back here.
  // However, since the email link opens in a new tab, the user will complete
  // verification there. For simplicity, we tell the user to check their email.

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-foreground">Email Verification</h3>
          <p className="text-sm text-muted-foreground">
            We'll send a verification link to your email address.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {!sentEmail ? (
        <>
          <div className="bg-muted/50 border border-border rounded-lg p-4 text-center">
            <Mail className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click below to receive a verification email. The link will prompt
              you to verify with your device's biometric (Windows Hello, Touch ID, etc.)
              to unlock your encryption keys.
            </p>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Verification Email
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
          <div className="text-center">
            <p className="font-medium text-foreground">Email Sent</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check your inbox at <span className="font-mono text-foreground">{sentEmail}</span>
            </p>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3 w-full">
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Open the email from BlockDrive Vault</li>
              <li>Click "Verify Now"</li>
              <li>Complete the biometric prompt on that page</li>
              <li>Return to this tab — it will unlock automatically</li>
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">
            The link expires in 15 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
