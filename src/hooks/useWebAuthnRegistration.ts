import { useState, useCallback, useRef } from 'react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';

export function useWebAuthnRegistration() {
  const { supabase } = useDynamicAuth();
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = browserSupportsWebAuthn();

  const register = useCallback(async (deviceName?: string): Promise<boolean> => {
    setIsRegistering(true);
    setError(null);

    try {
      // 1. Get registration options from server
      const { data: optionsData, error: optionsErr } = await supabaseRef.current.functions.invoke(
        'webauthn-registration',
        { body: { action: 'generate-options', device_name: deviceName } }
      );

      if (optionsErr) throw new Error(optionsErr.message);
      if (!optionsData?.success) throw new Error(optionsData?.error || 'Failed to get options');

      // 2. Trigger browser WebAuthn (OS-native biometric prompt)
      const attResp = await startRegistration({ optionsJSON: optionsData.options });

      // 3. Verify registration with server
      const { data: verifyData, error: verifyErr } = await supabaseRef.current.functions.invoke(
        'webauthn-registration',
        { body: { action: 'verify-registration', attestation: attResp, device_name: deviceName } }
      );

      if (verifyErr) throw new Error(verifyErr.message);
      if (!verifyData?.success) throw new Error(verifyData?.error || 'Registration failed');

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      // Friendly messages for known WebAuthn errors
      if (message.includes('NotAllowedError') || message.includes('cancelled')) {
        setError('Biometric authentication was cancelled. Please try again.');
      } else if (message.includes('InvalidStateError')) {
        setError('This device is already registered.');
      } else if (message.includes('NotSupportedError')) {
        setError('Biometric authentication is not supported on this device.');
      } else {
        setError(message);
      }
      return false;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const hasCredentials = useCallback(async (): Promise<boolean> => {
    const { data, error: err } = await supabaseRef.current.functions.invoke(
      'webauthn-registration',
      { body: { action: 'has-credentials' } }
    );

    if (err) throw new Error(err.message || 'Failed to check credentials');
    return data?.hasCredentials ?? false;
  }, []);

  return { register, hasCredentials, isRegistering, error, isSupported };
}
