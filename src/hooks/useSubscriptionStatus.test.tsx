import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, beforeEach, afterEach } from 'vitest';
import {
  setMockClerkAuth,
  resetMockClerkAuth,
  mockClerkUser,
} from '@/test/mocks/clerk';
import {
  resetMockCrossmintWallet,
} from '@/test/mocks/crossmint';
import {
  setMockInvokeResponse,
  resetMockSupabase,
} from '@/test/mocks/supabase';

// Must import mocks before the module under test
import '@/test/mocks/clerk';
import '@/test/mocks/crossmint';
import '@/test/mocks/supabase';

import { useSubscriptionStatus } from './useSubscriptionStatus';

beforeEach(() => {
  resetMockClerkAuth();
  resetMockCrossmintWallet();
  resetMockSupabase();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSubscriptionStatus', () => {
  it('returns null subscription when no user', () => {
    setMockClerkAuth({ isSignedIn: false, user: null, userId: null });

    const { result } = renderHook(() => useSubscriptionStatus());

    // With no user, the hook clears subscription state but loading remains
    // true (since checkSubscription never runs). This is expected — the
    // consuming component gates on auth state, not loading.
    expect(result.current.subscriptionStatus).toBeNull();
  });

  it('calls check-subscription for Clerk user', async () => {
    const mockSubscription = {
      subscribed: true,
      subscription_tier: 'pro',
      subscription_end: '2026-03-01',
      limits: { storage: 1099511627776, bandwidth: 0, seats: 1 },
    };

    setMockInvokeResponse(mockSubscription);

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toEqual(mockSubscription);
    expect(result.current.error).toBeNull();
  });

  it('gracefully returns null on network error', async () => {
    setMockInvokeResponse(null, { message: 'Network error' });

    const { result } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.subscriptionStatus).toBeNull();
    // Error is swallowed — not shown to user
    expect(result.current.error).toBeNull();
  });

  it('clears subscription on sign out', async () => {
    setMockInvokeResponse({ subscribed: true, subscription_tier: 'pro', subscription_end: null, limits: { storage: 0, bandwidth: 0, seats: 1 } });

    const { result, rerender } = renderHook(() => useSubscriptionStatus());

    await waitFor(() => {
      expect(result.current.subscriptionStatus).not.toBeNull();
    });

    // Simulate sign-out
    setMockClerkAuth({ isSignedIn: false, user: null, userId: null });
    rerender();

    await waitFor(() => {
      expect(result.current.subscriptionStatus).toBeNull();
    });
  });
});
