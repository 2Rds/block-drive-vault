import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Fingerprint, Loader2, CheckCircle2 } from 'lucide-react';
import { useWebAuthnRegistration } from '@/hooks/useWebAuthnRegistration';

interface WebAuthnSetupProps {
  onComplete: () => void;
}

export function WebAuthnSetup({ onComplete }: WebAuthnSetupProps) {
  const { register, isRegistering, error, isSupported } = useWebAuthnRegistration();
  const [deviceName, setDeviceName] = useState('');
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleRegister = async () => {
    const ok = await register(deviceName.trim() || undefined);
    if (ok) {
      setSuccess(true);
      timeoutRef.current = setTimeout(onComplete, 1200);
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-full">
            <Fingerprint className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Biometric Not Available</h3>
            <p className="text-sm text-muted-foreground">
              Your browser does not support biometric authentication.
              Please use a modern browser (Chrome, Safari, Edge, or Firefox).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-sm font-medium text-foreground">Biometric registered successfully</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-full">
          <Fingerprint className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Set Up Biometric Unlock</h3>
          <p className="text-sm text-muted-foreground">
            Use your fingerprint, face, or device PIN to unlock your encryption keys.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Device Name (optional)</Label>
          <Input
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. My Laptop, Work PC"
            disabled={isRegistering}
          />
          <p className="text-xs text-muted-foreground">
            Helps you identify this device later if you use multiple devices.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <Button
        onClick={handleRegister}
        disabled={isRegistering}
        className="w-full"
      >
        {isRegistering ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Waiting for biometric...
          </>
        ) : (
          <>
            <Fingerprint className="w-4 h-4 mr-2" />
            Register Biometric
          </>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        This will trigger your device's native biometric prompt
        (Windows Hello, Touch ID, Face ID, or fingerprint).
      </p>
    </div>
  );
}
