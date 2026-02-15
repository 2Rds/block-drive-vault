import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useWebAuthnAuthentication } from '@/hooks/useWebAuthnAuthentication';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/clerk/ClerkSupabaseClient';

const QR_EXPIRY_SECONDS = 300; // 5 minutes

/** Poll the server to check if the phone completed verification for this session. */
async function checkSessionStatus(sessionId: string): Promise<string | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-authentication`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action: 'check-session-status', session_id: sessionId }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data?.completed && data?.assertion_token) {
      return data.assertion_token;
    }
  } catch {
    // Will retry
  }
  return null;
}

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
  const [isChecking, setIsChecking] = useState(false);
  const [pollStatus, setPollStatus] = useState<string>('');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completedRef = useRef(false);

  // Auto-poll using window.setInterval (bypasses React effect lifecycle)
  useEffect(() => {
    if (!sessionId) return;
    completedRef.current = false;

    const intervalId = window.setInterval(async () => {
      if (completedRef.current) return;
      const token = await checkSessionStatus(sessionId);
      if (token && !completedRef.current) {
        completedRef.current = true;
        window.clearInterval(intervalId);
        setPollStatus('Found! Unlocking...');
        onCompleteRef.current(token);
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [sessionId]);

  // Manual check button handler
  const handleManualCheck = async () => {
    if (!sessionId) return;
    setIsChecking(true);
    const token = await checkSessionStatus(sessionId);
    if (token && !completedRef.current) {
      completedRef.current = true;
      onCompleteRef.current(token);
    } else {
      setPollStatus('Not yet — try again in a moment');
      setTimeout(() => setPollStatus(''), 3000);
    }
    setIsChecking(false);
  };

  // Create QR session on mount
  const createSession = useCallback(async () => {
    setIsLoading(true);
    completedRef.current = false;
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

  // Countdown timer
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

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
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

      {/* Manual completion check — reliable fallback */}
      {!isLoading && qrUrl && !expired && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleManualCheck}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              I've verified on my phone
            </>
          )}
        </Button>
      )}

      {pollStatus && (
        <p className="text-xs text-center text-muted-foreground">{pollStatus}</p>
      )}

      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Open your phone's camera or QR scanner</li>
          <li>Point it at the QR code above</li>
          <li>Complete the biometric verification on your phone</li>
          <li>Tap "I've verified on my phone" above, or wait for auto-unlock</li>
        </ol>
      </div>
    </div>
  );
}
