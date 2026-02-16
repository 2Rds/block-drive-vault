import { useEffect, useState } from 'react';
import { IntercomUser } from '@/services/intercomService';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

interface OptimizedIntercomMessengerProps {
  user?: IntercomUser;
  isAuthenticated?: boolean;
}

async function fetchIntercomJwt(supabase: any): Promise<string | undefined> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-intercom-jwt');
    if (error) {
      console.error('Failed to fetch Intercom JWT:', error);
      return undefined;
    }
    return data?.jwt;
  } catch (e) {
    console.error('Intercom JWT fetch error:', e);
    return undefined;
  }
}

export const OptimizedIntercomMessenger = ({ user, isAuthenticated }: OptimizedIntercomMessengerProps) => {
  const [isIntercomReady, setIsIntercomReady] = useState(false);
  const { supabase } = useClerkAuth();

  useEffect(() => {
    const initializeIntercom = async () => {
      try {
        const { intercomService } = await import('@/services/intercomService');

        if (isAuthenticated && user) {
          const jwt = await fetchIntercomJwt(supabase);
          await intercomService.boot({ ...user, jwt });
        } else if (isAuthenticated === false) {
          await intercomService.initialize();
        }
        setIsIntercomReady(true);
      } catch (error) {
        console.error('Intercom initialization failed:', error);
      }
    };

    // Defer to avoid blocking TBT
    const deferredInit = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          requestIdleCallback(initializeIntercom, { timeout: 5000 });
        }, { timeout: 3000 });
      } else {
        setTimeout(() => {
          setTimeout(initializeIntercom, 2000);
        }, 1000);
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(deferredInit, { timeout: 10000 });
    } else {
      setTimeout(deferredInit, 5000);
    }
  }, [user, isAuthenticated, supabase]);

  useEffect(() => {
    if (isIntercomReady && isAuthenticated && user) {
      const updateUser = async () => {
        try {
          const jwt = await fetchIntercomJwt(supabase);
          const { intercomService } = await import('@/services/intercomService');
          await intercomService.update({ ...user, jwt });
        } catch (error) {
          console.error('Intercom update failed:', error);
        }
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(updateUser, { timeout: 2000 });
      } else {
        setTimeout(updateUser, 1000);
      }
    }
  }, [user, isAuthenticated, isIntercomReady, supabase]);

  return null;
};
