import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  SecurityLevel,
  WalletDerivedKeys,
  DerivedEncryptionKey,
  KeyDerivationSession
} from '@/types/blockdriveCrypto';
import { deriveKeyFromMaterial } from '@/services/crypto/keyDerivationService';
import { hexToBytes } from '@/services/crypto/cryptoUtils';
import { useAuth } from './useAuth';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { toast } from 'sonner';

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const ALL_SECURITY_LEVELS = [SecurityLevel.STANDARD, SecurityLevel.SENSITIVE, SecurityLevel.MAXIMUM] as const;
const ANSWER_HASH_KEY = 'bd_session_hash';

// ── Module-level singleton key store (shared across all hook instances) ──

let _keys: WalletDerivedKeys | null = null;
let _session: KeyDerivationSession | null = null;
let _answerHash: string | null = null;
let _version = 0; // bumped on every mutation so subscribers re-render
let _autoRestoreAttempted = false;

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
  initializeKeys: (answerHash?: string) => Promise<boolean>;
  getKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  refreshKey: (level: SecurityLevel) => Promise<CryptoKey | null>;
  clearKeys: () => void;
  sessionExpiresAt: number | null;
  isSessionValid: boolean;
}

export function useWalletCrypto(): UseWalletCryptoReturn {
  const { walletData } = useAuth();
  const crossmintWallet = useCrossmintWallet();
  const { supabase } = useClerkAuth();

  // Re-render whenever the singleton store changes
  useSyncExternalStore(_subscribe, _getVersion, _getVersion);

  const [state, setState] = useState<WalletCryptoState>({
    isInitialized: _keys?.initialized ?? false,
    isInitializing: false,
    currentLevel: null,
    error: null,
    needsSecurityQuestion: false
  });

  // Sync local state with singleton on mount / store change
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
    _autoRestoreAttempted = false;
    try { sessionStorage.removeItem(ANSWER_HASH_KEY); } catch {}
    _notify();
    setState({
      isInitialized: false,
      isInitializing: false,
      currentLevel: null,
      error: null,
      needsSecurityQuestion: false
    });
  }, []);

  const hasAnyWallet = walletData?.connected || crossmintWallet.isInitialized;

  useEffect(() => {
    if (!hasAnyWallet) {
      clearKeys();
    }
  }, [hasAnyWallet, clearKeys]);

  const hasKey = useCallback((level: SecurityLevel): boolean => {
    return _keys?.keys.has(Number(level) as SecurityLevel) ?? false;
  }, []);

  const requestAllKeyMaterials = useCallback(async (
    answerHash: string
  ): Promise<Record<string, string>> => {
    const { data, error } = await supabase.functions.invoke('derive-key-material', {
      body: { answer_hash: answerHash },
    });

    if (error) throw new Error(error.message || 'Failed to derive key material');
    if (!data?.success) throw new Error(data?.error || 'Key derivation failed');

    return data.key_materials;
  }, [supabase]);

  const initializeKeys = useCallback(async (answerHash?: string): Promise<boolean> => {
    // If keys are already initialized and session is valid, skip
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) {
      setState(prev => ({ ...prev, isInitialized: true, needsSecurityQuestion: false }));
      return true;
    }

    const hasCrossmintWallet = crossmintWallet.isInitialized && crossmintWallet.walletAddress;
    const hasExternalWallet = walletData?.connected && walletData?.address;

    if (!hasCrossmintWallet && !hasExternalWallet) {
      setState(prev => ({ ...prev, error: 'No wallet connected' }));
      return false;
    }

    // If no answerHash provided, try to recover from memory or sessionStorage
    if (!answerHash) {
      const cached = _answerHash || (() => {
        try { return sessionStorage.getItem(ANSWER_HASH_KEY); } catch { return null; }
      })();
      if (cached) {
        answerHash = cached;
      } else {
        setState(prev => ({ ...prev, needsSecurityQuestion: true }));
        return false;
      }
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null, needsSecurityQuestion: false }));

    const walletAddress = crossmintWallet.walletAddress || walletData?.address || '';

    try {
      _session = {
        walletAddress,
        signatures: new Map(),
        keys: new Map(),
        isComplete: false,
        expiresAt: Date.now() + SESSION_EXPIRY_MS
      };

      _keys = {
        walletAddress,
        keys: new Map(),
        initialized: false,
        lastRefreshed: Date.now()
      };

      const keyMaterials = await requestAllKeyMaterials(answerHash);

      for (const level of ALL_SECURITY_LEVELS) {
        const materialHex = keyMaterials[String(level)];
        if (!materialHex) throw new Error(`Missing key material for level ${level}`);

        const material = hexToBytes(materialHex);
        const key = await deriveKeyFromMaterial(material, level);

        _session.keys.set(level, key.key);
        _keys.keys.set(level, key);
      }

      _answerHash = answerHash;
      _session.isComplete = true;
      _keys.initialized = true;

      // Persist answer hash to sessionStorage so keys survive page refresh
      try { sessionStorage.setItem(ANSWER_HASH_KEY, answerHash); } catch {}

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
      _notify();

      const errorMessage = error instanceof Error ? error.message : 'Key initialization failed';
      setState({
        isInitialized: false,
        isInitializing: false,
        currentLevel: null,
        error: errorMessage,
        needsSecurityQuestion: false
      });

      // If auto-restore failed (bad hash), clear the stored hash
      try { sessionStorage.removeItem(ANSWER_HASH_KEY); } catch {}

      return false;
    }
  }, [crossmintWallet, walletData, requestAllKeyMaterials]);

  // Auto-restore keys from sessionStorage on mount / wallet connect
  useEffect(() => {
    if (!hasAnyWallet) return;
    if (_keys?.initialized && _session && Date.now() < _session.expiresAt) return;
    if (_autoRestoreAttempted) return;

    const storedHash = (() => {
      try { return sessionStorage.getItem(ANSWER_HASH_KEY); } catch { return null; }
    })();

    if (storedHash) {
      _autoRestoreAttempted = true;
      initializeKeys(storedHash);
    }
  }, [hasAnyWallet, initializeKeys]);

  const getKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!isSessionValid()) {
      if (_answerHash) {
        const success = await initializeKeys(_answerHash);
        if (!success) return null;
      } else {
        setState(prev => ({ ...prev, needsSecurityQuestion: true }));
        return null;
      }
    }

    const cachedKey = _keys?.keys.get(Number(level) as SecurityLevel);
    if (cachedKey) return cachedKey.key;

    return null;
  }, [isSessionValid, initializeKeys]);

  const refreshKey = useCallback(async (level: SecurityLevel): Promise<CryptoKey | null> => {
    if (!_answerHash) {
      setState(prev => ({ ...prev, needsSecurityQuestion: true }));
      return null;
    }
    const success = await initializeKeys(_answerHash);
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
