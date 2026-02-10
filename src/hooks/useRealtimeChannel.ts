import { useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

/**
 * Subscribe to a Supabase Realtime broadcast channel.
 * Used for QR flow: desktop listens for mobile's auth completion signal.
 */
export function useRealtimeChannel(
  channelName: string | null,
  onMessage: (payload: Record<string, unknown>) => void
) {
  const { supabase } = useClerkAuth();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!channelName) return;

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        onMessageRef.current(payload as Record<string, unknown>);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, supabase]);

  const broadcast = useCallback((payload: Record<string, unknown>) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload,
    });
  }, []);

  return { broadcast };
}
