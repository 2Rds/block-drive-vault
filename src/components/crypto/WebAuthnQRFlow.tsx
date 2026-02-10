import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import type { QRAuthCompletedPayload } from '@/types/webauthn';

const QR_EXPIRY_SECONDS = 300; // 5 minutes

interface WebAuthnQRFlowProps {
  onComplete: (assertionToken: string) => void;
  onBack: () => void;
}

export function WebAuthnQRFlow({ onComplete, onBack }: WebAuthnQRFlowProps) {
  const { startQRSession, error, clearError } = useWebAuthnAuthentication();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(QR_EXPIRY_SECONDS);

  // Realtime listener for mobile auth completion
  const channelName = sessionId ? `webauthn:${sessionId}` : null;

  const handleRealtimeMessage = useCallback((payload: Record<string, unknown>) => {
    const data = payload as unknown as QRAuthCompletedPayload;
    if (data.event === 'auth_completed' && data.assertionToken) {
      onComplete(data.assertionToken);
    }
  }, [onComplete]);

  const { channelError } = useRealtimeChannel(channelName, handleRealtimeMessage);

  // Create QR session on mount
  const createSession = useCallback(async () => {
    setIsLoading(true);
    const session = await startQRSession();
    if (session) {
      setQrUrl(session.qrUrl);
      setSessionId(session.sessionId);
      setSecondsLeft(QR_EXPIRY_SECONDS);
    }
    setIsLoading(false);
  }, [startQRSession]);

  useEffect(() => {
    createSession();
  }, [createSession]);

  // Countdown timer — only re-create when qrUrl changes (new QR generated)
  useEffect(() => {
    if (!qrUrl) return;
    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [qrUrl]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const expired = secondsLeft <= 0 && qrUrl;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="font-semibold text-foreground">Scan with Your Phone</h3>
          <p className="text-sm text-muted-foreground">
            Open your phone's camera and scan the QR code below.
          </p>
        </div>
      </div>

      {(error || channelError) && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error || channelError}</p>
          {channelError && (
            <p className="text-xs text-destructive/70 mt-1">
              The live connection failed. Try refreshing the QR code, or use email verification instead.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        {isLoading && (
          <div className="flex items-center justify-center w-[200px] h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && qrUrl && !expired && (
          <>
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG
                value={qrUrl}
                size={192}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Expires in <span className="font-mono font-medium text-foreground">{formatTime(secondsLeft)}</span>
            </p>
          </>
        )}

        {expired && (
          <div className="flex flex-col items-center gap-4 py-4">
            <QrCode className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">QR code expired</p>
            <Button variant="outline" onClick={createSession}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New QR Code
            </Button>
          </div>
        )}
      </div>

      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Open your phone's camera or QR scanner</li>
          <li>Point it at the QR code above</li>
          <li>Complete the biometric verification on your phone</li>
          <li>This screen will automatically unlock</li>
        </ol>
      </div>
    </div>
  );
}
