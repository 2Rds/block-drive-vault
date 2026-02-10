import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, QrCode, Mail, Loader2 } from 'lucide-react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';
import { WebAuthnQRFlow } from './WebAuthnQRFlow';
import { WebAuthnEmailFallback } from './WebAuthnEmailFallback';

type VerifyMode = 'choose' | 'direct' | 'qr' | 'email';

interface WebAuthnVerifyProps {
  onVerified: (assertionToken: string) => void;
  error?: string | null;
}

export function WebAuthnVerify({ onVerified, error: externalError }: WebAuthnVerifyProps) {
  const { authenticate, isAuthenticating, error, isSupported, clearError } = useWebAuthnAuthentication();
  const [mode, setMode] = useState<VerifyMode>('choose');

  const handleDirectAuth = async () => {
    setMode('direct');
    clearError();
    const result = await authenticate();
    if (result?.success) {
      onVerified(result.assertionToken);
    } else {
      setMode('choose');
    }
  };

  const handleQRComplete = (assertionToken: string) => {
    onVerified(assertionToken);
  };

  const handleEmailComplete = (assertionToken: string) => {
    onVerified(assertionToken);
  };

  const displayError = externalError || error;

  // QR flow sub-view
  if (mode === 'qr') {
    return (
      <div className="space-y-4">
        <WebAuthnQRFlow
          onComplete={handleQRComplete}
          onBack={() => { setMode('choose'); clearError(); }}
        />
      </div>
    );
  }

  // Email flow sub-view
  if (mode === 'email') {
    return (
      <div className="space-y-4">
        <WebAuthnEmailFallback
          onComplete={handleEmailComplete}
          onBack={() => { setMode('choose'); clearError(); }}
        />
      </div>
    );
  }

  // Main chooser / direct auth
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Fingerprint className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Unlock Your Encryption</h3>
          <p className="text-sm text-muted-foreground">
            Verify your identity to derive your encryption keys.
          </p>
        </div>
      </div>

      {displayError && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{displayError}</p>
        </div>
      )}

      {/* Primary: Direct biometric on this device */}
      {isSupported && (
        <Button
          onClick={handleDirectAuth}
          disabled={isAuthenticating}
          className="w-full h-14 text-base"
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Waiting for biometric...
            </>
          ) : (
            <>
              <Fingerprint className="w-5 h-5 mr-2" />
              Verify with Biometric
            </>
          )}
        </Button>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Secondary: QR code for mobile */}
      <Button
        variant="outline"
        onClick={() => { setMode('qr'); clearError(); }}
        disabled={isAuthenticating}
        className="w-full"
      >
        <QrCode className="w-4 h-4 mr-2" />
        Scan QR Code with Phone
      </Button>

      {/* Tertiary: Email fallback */}
      <Button
        variant="ghost"
        onClick={() => { setMode('email'); clearError(); }}
        disabled={isAuthenticating}
        className="w-full text-muted-foreground"
      >
        <Mail className="w-4 h-4 mr-2" />
        Email me a verification link
      </Button>
    </div>
  );
}
