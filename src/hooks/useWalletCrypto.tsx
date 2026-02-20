import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  SecurityLevel,
  WalletDerivedKeys,
  KeyDerivationSession
} from '@/types/blockdriveCrypto';
import { deriveKeysFromSignature, DERIVATION_MESSAGE } from '@/services/crypto/signatureKeyDerivation';
import { useDynamicWallet } from '@/hooks/useDynamicWallet';

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;

// ── Module-level singleton key store (shared across all hook instances) ──
// Survives SPA navigation; cleared on tab close or explicit clearKeys().

let _keys: WalletDerivedKeys | null = null;
let _session: KeyDerivationSession | null = null;
let _version = 0;

// In-flight dedup: prevents concurrent initializeKeys() calls from racing
let _initPromise: Promise<InitResult> | null = null;

const _listeners = new Set<() => void>();
function _notify() {
  _version++;
  _listeners.forEach(fn => fn());
}
function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}
function _getVersion() { return _version; }

// ── Types ──

export interface InitResult {
  success: boolean;
  error?: string;
}

interface WalletCryptoState {
  isInitialized: boolean;
  isInitializing: boolean;
  currentLevel: SecurityLevel | null;
  error: string | null;
}

interface UseWalletCryptoReturn {
  state: WalletCryptoState;
  hasKey: (level: SecurityLevel) => boolean;
  initializeKeys: () => Promise<InitResult>;
  getKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  refreshKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  clearKeys: () => void;
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
}

// ── Hook ──

export function useWalletCrypto(): UseWalletCryptoReturn {
  const dynamicWallet = useDynamicWallet();

  // Stable ref — prevent wallet hook re-renders from cascading through callback deps
  const walletRef = useRef(dynamicWallet);
  walletRef.current = dynamicWallet;

  // Re-render whenever the singleton store changes
  useSyncExternalStore(_subscribe, _getVersion, _getVersion);

  const [state, setState] = useState<WalletCryptoState>({
    isInitialized: _keys?.initialized ?? false,
    isInitializing: false,
    currentLevel: null,
    error: null,
  });

  useEffect(() => {
    const initialized = _keys?.initialized ?? false;
    setState(prev => {
      if (prev.isInitialized !== initialized) {
        return { ...prev, isInitialized: initialized };
      }
      return prev;
    });
  }, [_version]);

  const isSessionValid = useCallback(() => {
    if (!_session) return false;
    return Date.now() < _session.expiresAt;
  }, []);

  const clearKeys = useCallback(() => {
    _keys = null;
    _session = null;
    _initPromise = null;
    _notify();
    setState({
      isInitialized: false,
      isInitializing: false,
      currentLevel: null,
      error: null,
    });
  }, []);

  const hasAnyWallet = dynamicWallet.isInitialized;

  useEffect(() => {
    if (!hasAnyWallet) {
      // Don't clear valid keys during wallet hook re-initialization (e.g. after navigation).
      // Module-level _keys/_session persist across route changes; wallet hooks may briefly
      // return false while they reload async state.
      if (_keys?.initialized && _session && Date.now() < _session.expiresAt) return;
      clearKeys();
    }
  }, [hasAnyWallet, clearKeys]);

  const hasKey = useCallback((level: SecurityLevel): boolean => {
    return _keys?.keys.has(Number(level) as SecurityLevel) ?? false;
  }, []);

  /**
   * Core derivation logic. Called only by initializeKeys() with dedup guard.
   */
  const _doInitializeKeys = useCallback(async (): Promise<InitResult> => {
    const wallet = walletRef.current;
    const walletAddress = wallet.walletAddress;

    console.log('[useWalletCrypto] initializeKeys called:', {
      isInitialized: wallet.isInitialized,
      walletAddress: walletAddress?.slice(0, 8),
    });

    if (!walletAddress) {
      console.warn('[useWalletCrypto] No wallet connected');
      setState(prev => ({ ...prev, error: 'No wallet connected', isInitializing: false }));
      return { success: false, error: 'No wallet connected' };
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      console.log('[useWalletCrypto] Signing derivation message...');
      const signature = await wallet.signMessage(DERIVATION_MESSAGE);
      const expiresAt = Date.now() + SESSION_EXPIRY_MS;

      // Derive all 3 keys from the signature
      const derivedKeys = await deriveKeysFromSignature(signature);

      _session = {
        walletAddress,
        keys: new Map(),
        isComplete: false,
        expiresAt,
      };

      _keys = {
        walletAddress,
        keys: new Map(),
        initialized: false,
        lastRefreshed: Date.now(),
      };

      for (const [level, key] of derivedKeys) {
        _session.keys.set(level, key.key);
        _keys.keys.set(level, key);
      }

      _session.isComplete = true;
      _keys.initialized = true;

      _notify();

      setState({
        isInitialized: true,
        isInitializing: false,
        currentLevel: null,
        error: null,
      });

      return { success: true };
    } catch (error) {
      _keys = null;
      _session = null;
      _notify();

      const errorMessage = error instanceof Error ? error.message : 'Key initialization failed';
      console.error('[useWalletCrypto] Key derivation failed:', errorMessage);
      setState({
        isInitialized: false,
        isInitializing: false,
        currentLevel: null,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * Derive encryption keys from wallet signature.
   *
   * Flow:
   * 1. Check if keys are already initialized and valid → return success
   * 2. Deduplicate concurrent calls → return in-flight promise
   * 3. Call signMessage(DERIVATION_MESSAGE) → derive keys via HKDF
   *
   * The server NEVER sees the signature or derived keys.
   */
  const initializeKeys = useCallback(async (): Promise<InitResult> => {
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) {
      setState(prev => ({ ...prev, isInitialized: true }));
      return { success: true };
    }

    // Deduplicate: if another call is already in flight, return its promise
    if (_initPromise) return _initPromise;

    _initPromise = _doInitializeKeys();
    try {
      return await _initPromise;
    } finally {
      _initPromise = null;
    }
  }, [_doInitializeKeys]);

  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!isSessionValid()) {
      console.warn(`[useWalletCrypto] Session expired; re-deriving keys for getKey(level=${level})`);
      const result = await initializeKeys();
      if (!result.success) {
        console.error('[useWalletCrypto] getKey failed: could not re-initialize keys');
        return null;
      }
    }

    const cachedKey = _keys?.keys.get(Number(level) as SecurityLevel);
    if (!cachedKey) {
      console.error(`[useWalletCrypto] getKey: no key found for level ${level} despite successful init`);
    }
    return cachedKey?.key ?? null;
  }, [isSessionValid, initializeKeys]);

  const refreshKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    const result = await initializeKeys();
    if (!result.success) return null;
    return _keys?.keys.get(level)?.key ?? null;
  }, [initializeKeys]);

  return {
    state,
    hasKey,
    initializeKeys,
    getKey,
    refreshKey,
    clearKeys,
    sessionExpiresAt: _session?.expiresAt ?? null,
    isSessionValid: isSessionValid()
  };
}
