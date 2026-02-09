import { renderHook } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import {
  setMockClerkAuth,
  resetMockClerkAuth,
  mockClerkUser,
} from '@/test/mocks/clerk';
import {
  setMockCrossmintWallet,
  resetMockCrossmintWallet,
} from '@/test/mocks/crossmint';
import { useAuth } from './useAuth';

beforeEach(() => {
  resetMockClerkAuth();
  resetMockCrossmintWallet();
});

describe('useAuth', () => {
  it('returns Supabase-shaped user when signed in', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.id).toBe(mockClerkUser.id);
    expect(result.current.user!.email).toBe(mockClerkUser.email);
    expect(result.current.user!.app_metadata).toEqual({ provider: 'clerk' });
    expect(result.current.user!.user_metadata.username).toBe(mockClerkUser.username);
    expect(result.current.user!.user_metadata.full_name).toBe(mockClerkUser.fullName);
  });

  it('returns null user when signed out', () => {
    setMockClerkAuth({ isSignedIn: false, user: null, userId: null });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isSignedIn).toBe(false);
  });

  it('populates walletData when wallet connected', () => {
    setMockCrossmintWallet({
      walletAddress: 'GkX9abc123walletAddress',
      isInitialized: true,
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.walletData).not.toBeNull();
    expect(result.current.walletData!.address).toBe('GkX9abc123walletAddress');
    expect(result.current.walletData!.blockchain_type).toBe('solana');
    expect(result.current.solanaWalletAddress).toBe('GkX9abc123walletAddress');
    expect(result.current.isWalletReady).toBe(true);
  });

  it('returns null walletData when wallet not connected', () => {
    setMockCrossmintWallet({ walletAddress: null, isInitialized: false });

    const { result } = renderHook(() => useAuth());

    expect(result.current.walletData).toBeNull();
    expect(result.current.solanaWalletAddress).toBeNull();
    expect(result.current.isWalletReady).toBe(false);
  });

  it('loading reflects Clerk + wallet states', () => {
    setMockClerkAuth({ isLoaded: false });
    const { result: r1 } = renderHook(() => useAuth());
    expect(r1.current.loading).toBe(true);

    resetMockClerkAuth();
    setMockCrossmintWallet({ isLoading: true });
    const { result: r2 } = renderHook(() => useAuth());
    expect(r2.current.loading).toBe(true);

    resetMockCrossmintWallet();
    setMockClerkAuth({ isLoaded: true });
    const { result: r3 } = renderHook(() => useAuth());
    expect(r3.current.loading).toBe(false);
  });

  it('signOut delegates to clerkAuth.signOut', async () => {
    const mockSignOut = vi.fn().mockResolvedValue(undefined);
    setMockClerkAuth({ signOut: mockSignOut });

    const { result } = renderHook(() => useAuth());
    await result.current.signOut();

    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('session has correct shape when signed in', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.session).not.toBeNull();
    expect(result.current.session!.access_token).toBe('clerk-managed');
    expect(result.current.session!.token_type).toBe('bearer');
    expect(result.current.session!.user.id).toBe(mockClerkUser.id);
  });
});
