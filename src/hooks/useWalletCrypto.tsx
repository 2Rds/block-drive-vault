/**
 * Wallet Crypto Hook
 * 
 * React hook for managing wallet-derived encryption keys.
 * Handles the 3-signature setup flow and key caching.
 */

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
  getAllSignatureMessages
} from '@/services/crypto/keyDerivationService';
import { stringToBytes } from '@/services/crypto/cryptoUtils';
import { useAuth } from './useAuth';
import { useAlchemyWallet } from '@/components/auth/AlchemyProvider';
import { toast } from 'sonner';

// Session expiry time (4 hours)
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;

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
  const alchemyWallet = useAlchemyWallet();

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

  // Clear keys when wallet disconnects or Alchemy wallet is not initialized
  useEffect(() => {
    if (!walletData?.connected && !alchemyWallet.isInitialized) {
      clearKeys();
    }
  }, [walletData?.connected, alchemyWallet.isInitialized, clearKeys]);

  // Check if we have a key for a specific level
  const hasKey = useCallback((level: SecurityLevel): boolean => {
    return keysRef.current?.keys.has(level) ?? false;
  }, []);

  // Request wallet signature for a specific level
  const requestSignature = useCallback(async (level: SecurityLevel): Promise<Uint8Array | null> => {
    // Prefer Alchemy embedded wallet for signing
    if (alchemyWallet.isInitialized && alchemyWallet.signMessage) {
      const message = getSignatureMessage(level);
      const messageBytes = stringToBytes(message);

      try {
        console.log(`[useWalletCrypto] Requesting signature from Alchemy MPC wallet for level ${level}`);
        const signature = await alchemyWallet.signMessage(messageBytes);
        return signature;
      } catch (error) {
        console.error(`Failed to get signature from Alchemy wallet for level ${level}:`, error);
        throw error;
      }
    }

    // Fallback to external wallet adapter if available
    if (walletData?.adapter?.signMessage) {
      const message = getSignatureMessage(level);
      const messageBytes = stringToBytes(message);

      try {
        console.log(`[useWalletCrypto] Requesting signature from external wallet for level ${level}`);
        const signature = await walletData.adapter.signMessage(messageBytes);
        return signature;
      } catch (error) {
        console.error(`Failed to get signature from external wallet for level ${level}:`, error);
        throw error;
      }
    }

    throw new Error('No wallet available for message signing');
  }, [alchemyWallet, walletData]);

  // Derive key for a specific level
  const deriveKeyForLevel = useCallback(async (level: SecurityLevel): Promise<DerivedEncryptionKey | null> => {
    try {
      const signature = await requestSignature(level);
      if (!signature) return null;

      const key = await deriveKeyFromSignature(signature, level);
      
      // Store in session
      if (sessionRef.current) {
        sessionRef.current.signatures.set(level, signature);
        sessionRef.current.keys.set(level, key.key);
      }

      // Store in keys
      if (keysRef.current) {
        keysRef.current.keys.set(level, key);
      }

      return key;
    } catch (error) {
      console.error(`Failed to derive key for level ${level}:`, error);
      return null;
    }
  }, [requestSignature]);

  // Initialize all 3 keys
  const initializeKeys = useCallback(async (): Promise<boolean> => {
    // Check if either Alchemy wallet or external wallet is available
    const hasAlchemyWallet = alchemyWallet.isInitialized && alchemyWallet.solanaAddress;
    const hasExternalWallet = walletData?.connected && walletData?.address;

    if (!hasAlchemyWallet && !hasExternalWallet) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }));
      return false;
    }

    // Check if wallet supports signing (Alchemy always does, check external wallet)
    const canSign = hasAlchemyWallet || walletData?.adapter?.signMessage;

    if (!canSign) {
      setState(prev => ({ ...prev, error: 'Wallet does not support message signing' }));
      toast.error('Your wallet does not support message signing');
      return false;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    // Determine which wallet address to use
    const walletAddress = alchemyWallet.solanaAddress || walletData?.address || '';

    try {
      // Initialize session
      sessionRef.current = {
        walletAddress: walletAddress,
        signatures: new Map(),
        keys: new Map(),
        isComplete: false,
        expiresAt: Date.now() + SESSION_EXPIRY_MS
      };

      // Initialize keys storage
      keysRef.current = {
        walletAddress: walletAddress,
        keys: new Map(),
        initialized: false,
        lastRefreshed: Date.now()
      };

      toast.info('Please sign 3 messages to set up your encryption keys');

      // Request signatures for all 3 levels
      const levels = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM];
      
      for (const level of levels) {
        setState(prev => ({ ...prev, currentLevel: level }));
        
        const key = await deriveKeyForLevel(level);
        if (!key) {
          throw new Error(`Failed to derive key for security level ${level}`);
        }
      }

      // Mark as complete
      if (sessionRef.current) {
        sessionRef.current.isComplete = true;
      }
      if (keysRef.current) {
        keysRef.current.initialized = true;
      }

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
  }, [alchemyWallet, walletData, deriveKeyForLevel]);

  // Get key for a specific level (derives if not cached)
  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    // Check if session is still valid
    if (!isSessionValid()) {
      // Session expired, need to re-initialize
      const success = await initializeKeys();
      if (!success) return null;
    }

    // Check if we have the key cached
    const cachedKey = keysRef.current?.keys.get(level);
    if (cachedKey) {
      return cachedKey.key;
    }

    // Need to derive the key
    const key = await deriveKeyForLevel(level);
    return key?.key ?? null;
  }, [isSessionValid, initializeKeys, deriveKeyForLevel]);

  // Refresh a specific key (re-sign)
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
