import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import {
  SecurityLevel,
  WalletDerivedKeys,
  KeyDerivationSession
} from '@/types/blockdriveCrypto';
import { deriveKeyFromMaterial } from '@/services/crypto/keyDerivationService';
import { hexToBytes } from '@/services/crypto/cryptoUtils';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const ALL_SECURITY_LEVELS = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM] as const;
const ANSWER_HASH_KEY = 'bd_session_hash';
const SESSION_CACHE_KEY = 'bd_session_materials';

// ── Module-level singleton key store (shared across all hook instances) ──

let _keys: WalletDerivedKeys | null = null;
let _session: KeyDerivationSession | null = null;
let _answerHash: string | null = null;
let _assertionToken: string | null = null; // in-memory only, NOT persisted (single-use tokens)
let _version = 0; // bumped on every mutation so subscribers re-render
let _autoRestoreAttempted = false;

function _getStoredHash(): string | null {
  try { return sessionStorage.getItem(ANSWER_HASH_KEY); } catch { return null; }
}

// ── Cached key materials (survives navigation within the same tab) ──

interface CachedSession {
  /** Key materials by security level (hex strings) */
  m: Record<string, string>;
  /** Wallet address the materials were derived for */
  w: string;
  /** Expiry timestamp (ms) */
  e: number;
}

function _getCachedSession(): CachedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedSession = JSON.parse(raw);
    if (Date.now() >= cached.e) {
      sessionStorage.removeItem(SESSION_CACHE_KEY);
      return null;
    }
    return cached;
  } catch { return null; }
}

function _setCachedSession(c: CachedSession) {
  try { sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(c)); } catch {}
}

function _clearCachedSession() {
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
  needsSecurityQuestion: boolean;
}

interface UseWalletCryptoReturn {
  state: WalletCryptoState;
  hasKey: (level: SecurityLevel) => boolean;
  initializeKeys: (answerHash?: string, assertionToken?: string) => Promise<boolean>;
  getKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  refreshKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  clearKeys: () => void;
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
}

export function useWalletCrypto(): UseWalletCryptoReturn {
  const crossmintWallet = useCrossmintWallet();
  const { supabase } = useClerkAuth();

  // Stable refs — prevent Clerk token refresh (~60s) from cascading through callback deps
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const walletRef = useRef(crossmintWallet);
  walletRef.current = crossmintWallet;

  // Re-render whenever the singleton store changes
  useSyncExternalStore(_subscribe, _getVersion, _getVersion);

  const [state, setState] = useState<WalletCryptoState>({
    isInitialized: _keys?.initialized ?? false,
    isInitializing: false,
    currentLevel: null,
    error: null,
    needsSecurityQuestion: false
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
    _answerHash = null;
    _assertionToken = null;
    _autoRestoreAttempted = false;
    try { sessionStorage.removeItem(ANSWER_HASH_KEY); } catch {}
    _clearCachedSession();
    _notify();
    setState({
      isInitialized: false,
      isInitializing: false,
      currentLevel: null,
      error: null,
      needsSecurityQuestion: false
    });
  }, []);

  const hasAnyWallet = crossmintWallet.isInitialized;

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

  const requestAllKeyMaterials = useCallback(async (
    answerHash?: string,
    assertionToken?: string
  ): Promise<Record<string, string>> => {
    const body: Record<string, string> = {};
    if (assertionToken) {
      body.assertion_token = assertionToken;
    } else if (answerHash) {
      body.answer_hash = answerHash;
    } else {
      throw new Error('Either answerHash or assertionToken is required');
    }

    const { data, error } = await supabaseRef.current.functions.invoke('derive-key-material', {
      body,
    });

    if (error) throw new Error(error.message || 'Failed to derive key material');
    if (!data?.success) throw new Error(data?.error || 'Key derivation failed');

    return data.key_materials;
  }, []);

  const initializeKeys = useCallback(async (
    answerHash?: string,
    assertionToken?: string
  ): Promise<boolean> => {
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) {
      setState(prev => ({ ...prev, isInitialized: true, needsSecurityQuestion: false }));
      return true;
    }

    // Read latest wallet state from ref (not stale closure)
    const cm = walletRef.current;
    console.log('[useWalletCrypto] initializeKeys called:', {
      isInitialized: cm.isInitialized,
      walletAddress: cm.walletAddress?.slice(0, 8),
      hasAssertionToken: !!assertionToken,
      hasAnswerHash: !!answerHash,
    });

    if (!cm.isInitialized || !cm.walletAddress) {
      console.warn('[useWalletCrypto] No wallet connected');
      setState(prev => ({ ...prev, error: 'No wallet connected' }));
      return false;
    }

    const walletAddress = cm.walletAddress;

    // Check if we can restore from cached key materials (no server call needed)
    const cached = _getCachedSession();
    const hasCachedMaterials = cached && cached.w === walletAddress && Date.now() < cached.e;

    // Resolve credentials — only needed when there's no cached session
    if (!hasCachedMaterials) {
      if (!assertionToken && !answerHash) {
        const cachedHash = _answerHash || _getStoredHash();
        if (cachedHash) {
          answerHash = cachedHash;
        } else {
          setState(prev => ({ ...prev, needsSecurityQuestion: true }));
          return false;
        }
      }
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null, needsSecurityQuestion: false }));

    try {
      const expiresAt = hasCachedMaterials ? cached!.e : Date.now() + SESSION_EXPIRY_MS;

      _session = {
        walletAddress,
        signatures: new Map(),
        keys: new Map(),
        isComplete: false,
        expiresAt
      };

      _keys = {
        walletAddress,
        keys: new Map(),
        initialized: false,
        lastRefreshed: Date.now()
      };

      // Use cached materials or fetch from server
      const keyMaterials = hasCachedMaterials
        ? cached!.m
        : await requestAllKeyMaterials(answerHash, assertionToken);

      for (const level of ALL_SECURITY_LEVELS) {
        const materialHex = keyMaterials[String(level)];
        if (!materialHex) throw new Error(`Missing key material for level ${level}`);

        const material = hexToBytes(materialHex);
        const key = await deriveKeyFromMaterial(material, level);

        _session.keys.set(level, key.key);
        _keys.keys.set(level, key);
      }

      // Cache key materials for session persistence across navigation
      if (!hasCachedMaterials) {
        _setCachedSession({ m: keyMaterials, w: walletAddress, e: expiresAt });
      }

      // Store credentials for in-memory session reuse
      if (assertionToken) {
        _assertionToken = assertionToken;
      }
      if (answerHash) {
        _answerHash = answerHash;
        try { sessionStorage.setItem(ANSWER_HASH_KEY, answerHash); } catch {}
      }

      _session.isComplete = true;
      _keys.initialized = true;

      _notify();

      setState({
        isInitialized: true,
        isInitializing: false,
        currentLevel: null,
        error: null,
        needsSecurityQuestion: false
      });

      return true;
    } catch (error) {
      _keys = null;
      _session = null;
      _answerHash = null;
      _assertionToken = null;
      _clearCachedSession();
      _notify();

      const errorMessage = error instanceof Error ? error.message : 'Key initialization failed';
      setState({
        isInitialized: false,
        isInitializing: false,
        currentLevel: null,
        error: errorMessage,
        needsSecurityQuestion: false
      });

      try { sessionStorage.removeItem(ANSWER_HASH_KEY); } catch {}

      return false;
    }
  }, [requestAllKeyMaterials]);

  useEffect(() => {
    if (!hasAnyWallet) return;
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) return;
    if (_autoRestoreAttempted) return;

    // Try cached key materials first (works for both WebAuthn and legacy users,
    // avoids server round-trip on navigation)
    const cached = _getCachedSession();
    if (cached) {
      _autoRestoreAttempted = true;
      // Use .then() — initializeKeys never rejects; it returns false on failure
      initializeKeys().then(success => {
        if (!success) _autoRestoreAttempted = false;
      });
      return;
    }

    // Legacy: try answer_hash from sessionStorage (reusable, requires server call)
    const storedHash = _getStoredHash();
    if (storedHash) {
      _autoRestoreAttempted = true;
      initializeKeys(storedHash).then(success => {
        if (!success) _autoRestoreAttempted = false;
      });
    }
  }, [hasAnyWallet, initializeKeys]);

  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!isSessionValid()) {
      // Try to restore — initializeKeys will check cache, then answer hash
      const success = await initializeKeys(_answerHash || undefined);
      if (!success) return null;
    }

    const cachedKey = _keys?.keys.get(Number(level) as SecurityLevel);
    if (cachedKey) return cachedKey.key;

    return null;
  }, [isSessionValid, initializeKeys]);

  const refreshKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    // Refresh requires a server call. WebAuthn users without an answer hash
    // will restore from cached materials; if cache is also empty, prompt re-verify.
    const success = await initializeKeys(_answerHash || undefined);
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
