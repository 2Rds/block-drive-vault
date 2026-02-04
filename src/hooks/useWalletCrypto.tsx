import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SecurityLevel,
  WalletDerivedKeys,
  DerivedEncryptionKey,
  KeyDerivationSession
} from '@/types/blockdriveCrypto';
import {
  deriveKeyFromSignature,
  getSignatureMessage,
} from '@/services/crypto/keyDerivationService';
import { stringToBytes } from '@/services/crypto/cryptoUtils';
import { useAuth } from './useAuth';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { toast } from 'sonner';

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const ALL_SECURITY_LEVELS = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM] as const;

interface WalletCryptoState {
  isInitialized: boolean;
  isInitializing: boolean;
  currentLevel: SecurityLevel | null;
  error: string | null;
}

interface UseWalletCryptoReturn {
  // State
  state: WalletCryptoState;
  hasKey: (level: SecurityLevel) => boolean;

  // Actions
  initializeKeys: () => Promise<boolean>;
  getKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  refreshKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  clearKeys: () => void;

  // Session info
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
}

export function useWalletCrypto(): UseWalletCryptoReturn {
  const { walletData } = useAuth();
  const crossmintWallet = useCrossmintWallet();

  const [state, setState] = useState<WalletCryptoState>({
    isInitialized: false,
    isInitializing: false,
    currentLevel: null,
    error: null
  });

  // Store keys in ref to prevent re-renders and keep them in memory only
  const keysRef = useRef<WalletDerivedKeys | null>(null);
  const sessionRef = useRef<KeyDerivationSession | null>(null);

  // Check if session is valid
  const isSessionValid = useCallback(() => {
    if (!sessionRef.current) return false;
    return Date.now() < sessionRef.current.expiresAt;
  }, []);

  // Clear keys from memory
  const clearKeys = useCallback(() => {
    keysRef.current = null;
    sessionRef.current = null;
    setState({
      isInitialized: false,
      isInitializing: false,
      currentLevel: null,
      error: null
    });
  }, []);

  const hasAnyWallet = walletData?.connected || crossmintWallet.isInitialized;

  useEffect(() => {
    if (!hasAnyWallet) {
      clearKeys();
    }
  }, [hasAnyWallet, clearKeys]);

  // Check if we have a key for a specific level
  const hasKey = useCallback((level: SecurityLevel): boolean => {
    return keysRef.current?.keys.has(level) ?? false;
  }, []);

  const requestSignature = useCallback(async (level: SecurityLevel): Promise<Uint8Array> => {
    const message = getSignatureMessage(level);
    const messageBytes = stringToBytes(message);

    if (crossmintWallet.isInitialized && crossmintWallet.signMessage) {
      console.log(`[useWalletCrypto] Requesting signature from Crossmint wallet for level ${level}`);
      return crossmintWallet.signMessage(messageBytes);
    }

    if (walletData?.adapter?.signMessage) {
      console.log(`[useWalletCrypto] Requesting signature from external wallet for level ${level}`);
      return walletData.adapter.signMessage(messageBytes);
    }

    throw new Error('No wallet available for message signing');
  }, [crossmintWallet, walletData]);

  const deriveKeyForLevel = useCallback(async (level: SecurityLevel): Promise<DerivedEncryptionKey | null> => {
    try {
      const signature = await requestSignature(level);
      const key = await deriveKeyFromSignature(signature, level);

      if (sessionRef.current) {
        sessionRef.current.signatures.set(level, signature);
        sessionRef.current.keys.set(level, key.key);
      }

      if (keysRef.current) {
        keysRef.current.keys.set(level, key);
      }

      return key;
    } catch (error) {
      console.error(`Failed to derive key for level ${level}:`, error);
      return null;
    }
  }, [requestSignature]);

  const initializeKeys = useCallback(async (): Promise<boolean> => {
    const hasCrossmintWallet = crossmintWallet.isInitialized && crossmintWallet.walletAddress;
    const hasExternalWallet = walletData?.connected && walletData?.address;

    if (!hasCrossmintWallet && !hasExternalWallet) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }));
      return false;
    }

    const canSign = hasCrossmintWallet || walletData?.adapter?.signMessage;
    if (!canSign) {
      setState(prev => ({ ...prev, error: 'Wallet does not support message signing' }));
      toast.error('Your wallet does not support message signing');
      return false;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    const walletAddress = crossmintWallet.walletAddress || walletData?.address || '';

    try {
      sessionRef.current = {
        walletAddress,
        signatures: new Map(),
        keys: new Map(),
        isComplete: false,
        expiresAt: Date.now() + SESSION_EXPIRY_MS
      };

      keysRef.current = {
        walletAddress,
        keys: new Map(),
        initialized: false,
        lastRefreshed: Date.now()
      };

      toast.info('Please sign 3 messages to set up your encryption keys');

      for (const level of ALL_SECURITY_LEVELS) {
        setState(prev => ({ ...prev, currentLevel: level }));
        const key = await deriveKeyForLevel(level);
        if (!key) {
          throw new Error(`Failed to derive key for security level ${level}`);
        }
      }

      if (sessionRef.current) sessionRef.current.isComplete = true;
      if (keysRef.current) keysRef.current.initialized = true;

      setState({
        isInitialized: true,
        isInitializing: false,
        currentLevel: null,
        error: null
      });

      toast.success('Encryption keys initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Key initialization failed';
      setState({
        isInitialized: false,
        isInitializing: false,
        currentLevel: null,
        error: errorMessage
      });
      toast.error(errorMessage);
      return false;
    }
  }, [crossmintWallet, walletData, deriveKeyForLevel]);

  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!isSessionValid()) {
      const success = await initializeKeys();
      if (!success) return null;
    }

    const cachedKey = keysRef.current?.keys.get(level);
    if (cachedKey) return cachedKey.key;

    const key = await deriveKeyForLevel(level);
    return key?.key ?? null;
  }, [isSessionValid, initializeKeys, deriveKeyForLevel]);

  const refreshKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    const key = await deriveKeyForLevel(level);
    return key?.key ?? null;
  }, [deriveKeyForLevel]);

  return {
    state,
    hasKey,
    initializeKeys,
    getKey,
    refreshKey,
    clearKeys,
    sessionExpiresAt: sessionRef.current?.expiresAt ?? null,
    isSessionValid: isSessionValid()
  };
}
