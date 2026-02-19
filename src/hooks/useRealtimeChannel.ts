import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';

/**
 * Subscribe to a Supabase Realtime broadcast channel.
 * Used for QR flow: desktop listens for mobile's auth completion signal.
 * Automatically unsubscribes when channelName changes or on unmount.
 */
export function useRealtimeChannel(
  channelName: string | null,
  onMessage: (payload: Record<string, unknown>) => void
) {
  const { supabase } = useDynamicAuth();
  // Stable ref so the channel doesn't tear down/recreate on auth token refresh
  const supabaseRef = useRef(supabase);
  supabaseRef.current = supabase;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const [channelError, setChannelError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelName) return;

    setChannelError(null);
    const channel = supabaseRef.current.channel(channelName);

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        onMessageRef.current(payload as Record<string, unknown>);
      })
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[useRealtimeChannel] Subscription failed (${status}):`, err);
          setChannelError(`Realtime connection failed: ${status}`);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName]);

  const broadcast = useCallback(async (payload: Record<string, unknown>): Promise<boolean> => {
    if (!channelRef.current) {
      console.warn('[useRealtimeChannel] Cannot broadcast: no active channel');
      return false;
    }
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload,
      });
      return true;
    } catch (err) {
      console.error('[useRealtimeChannel] Broadcast failed:', err);
      return false;
    }
  }, []);

  return { broadcast, channelError };
}
