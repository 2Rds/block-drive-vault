import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  SecurityLevel,
  WalletDerivedKeys,
  KeyDerivationSession
} from '@/types/blockdriveCrypto';
import { deriveKeysFromSignature, DERIVATION_MESSAGE } from '@/services/crypto/signatureKeyDerivation';
import { bytesToHex, hexToBytes } from '@/services/crypto/cryptoUtils';
import { useDynamicWallet } from '@/hooks/useDynamicWallet';

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const SESSION_CACHE_KEY = 'bd_session_sig';

// ── Module-level singleton key store (shared across all hook instances) ──

let _keys: WalletDerivedKeys | null = null;
let _session: KeyDerivationSession | null = null;
let _version = 0; // bumped on every mutation so subscribers re-render
let _autoRestoreAttempted = false;

// ── Cached signature (survives navigation within the same tab) ──
// WS3 will remove this entirely; kept for now to avoid re-signing on every navigation

interface CachedSignature {
  /** Signature hex string */
  s: string;
  /** Wallet address */
  w: string;
  /** Expiry timestamp (ms) */
  e: number;
}

function _getCachedSignature(): CachedSignature | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedSignature = JSON.parse(raw);
    if (Date.now() >= cached.e) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return cached;
  } catch { return null; }
}

function _setCachedSignature(c: CachedSignature) {
  try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(c)); } catch {}
}

function _clearCachedSignature() {
  try { sessionStorage.removeItem(SESSION_CACHE_KEY); } catch {}
}

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

// ── Hook ──

interface WalletCryptoState {
  isInitialized: boolean;
  isInitializing: boolean;
  currentLevel: SecurityLevel | null;
  error: string | null;
}

interface UseWalletCryptoReturn {
  state: WalletCryptoState;
  hasKey: (level: SecurityLevel) => boolean;
  initializeKeys: () => Promise<boolean>;
  getKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  refreshKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  clearKeys: () => void;
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
}

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
    _autoRestoreAttempted = false;
    _clearCachedSignature();
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
   * Derive encryption keys from wallet signature.
   *
   * Flow:
   * 1. Check if keys are already initialized and valid → return true
   * 2. Try cached signature from sessionStorage → derive without re-signing
   * 3. Call signMessage(DERIVATION_MESSAGE) → get fresh signature → derive keys
   *
   * The server NEVER sees the signature or derived keys.
   */
  const initializeKeys = useCallback(async (): Promise<boolean> => {
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) {
      setState(prev => ({ ...prev, isInitialized: true }));
      return true;
    }

    // Read latest wallet state from ref (not stale closure)
    const wallet = walletRef.current;
    const walletAddress = wallet.walletAddress;

    console.log('[useWalletCrypto] initializeKeys called:', {
      isInitialized: wallet.isInitialized,
      walletAddress: walletAddress?.slice(0, 8),
    });

    if (!walletAddress) {
      console.warn('[useWalletCrypto] No wallet connected');
      setState(prev => ({ ...prev, error: 'No wallet connected' }));
      return false;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Try cached signature first (avoids re-signing on navigation)
      const cached = _getCachedSignature();
      let signature: Uint8Array;
      let expiresAt: number;

      if (cached && cached.w === walletAddress && Date.now() < cached.e) {
        signature = hexToBytes(cached.s);
        expiresAt = cached.e;
        console.log('[useWalletCrypto] Restored signature from cache');
      } else {
        // Sign the derivation message with the wallet
        console.log('[useWalletCrypto] Signing derivation message...');
        signature = await wallet.signMessage(DERIVATION_MESSAGE);
        expiresAt = Date.now() + SESSION_EXPIRY_MS;

        // Cache signature for session persistence across navigation (WS3 will remove this)
        _setCachedSignature({ s: bytesToHex(signature), w: walletAddress, e: expiresAt });
      }

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

      return true;
    } catch (error) {
      _keys = null;
      _session = null;
      _clearCachedSignature();
      _notify();

      const errorMessage = error instanceof Error ? error.message : 'Key initialization failed';
      console.error('[useWalletCrypto] Key derivation failed:', errorMessage);
      setState({
        isInitialized: false,
        isInitializing: false,
        currentLevel: null,
        error: errorMessage,
      });

      return false;
    }
  }, []);

  // Auto-restore keys when wallet becomes available
  useEffect(() => {
    if (!hasAnyWallet) return;
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) return;
    if (_autoRestoreAttempted) return;

    // Try restoring from cached signature (no signing prompt needed)
    const cached = _getCachedSignature();
    if (cached) {
      _autoRestoreAttempted = true;
      initializeKeys().then(success => {
        if (!success) _autoRestoreAttempted = false;
      });
    }
  }, [hasAnyWallet, initializeKeys]);

  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!isSessionValid()) {
      const success = await initializeKeys();
      if (!success) return null;
    }

    const cachedKey = _keys?.keys.get(Number(level) as SecurityLevel);
    if (cachedKey) return cachedKey.key;

    return null;
  }, [isSessionValid, initializeKeys]);

  const refreshKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    const success = await initializeKeys();
    if (!success) return null;
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
