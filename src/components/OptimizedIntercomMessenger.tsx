import { useEffect, useState } from 'react';
import { IntercomUser } from '@/services/intercomService';

interface OptimizedIntercomMessengerProps {
  user?: IntercomUser;
  isAuthenticated?: boolean;
}

export const OptimizedIntercomMessenger = ({ user, isAuthenticated }: OptimizedIntercomMessengerProps) => {
  const [isIntercomReady, setIsIntercomReady] = useState(false);

  useEffect(() => {
    // More aggressive deferring to reduce TBT impact
    const initializeIntercom = async () => {
      try {
        // Dynamic import to avoid blocking main thread
        const { intercomService } = await import('@/services/intercomService');
        
        if (isAuthenticated && user) {
          await intercomService.boot(user);
        } else if (isAuthenticated === false) {
          await intercomService.initialize();
        }
        setIsIntercomReady(true);
      } catch (error) {
        console.error('Intercom initialization failed:', error);
      }
    };

    // Use multiple levels of deferring to ensure Intercom doesn't block TBT
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

    // Only initialize after page has been interactive for a while
    if ('requestIdleCallback' in window) {
      requestIdleCallback(deferredInit, { timeout: 10000 });
    } else {
      setTimeout(deferredInit, 5000);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Update user data when it changes, but only after Intercom is ready
    if (isIntercomReady && isAuthenticated && user) {
      const updateUser = async () => {
        try {
          const { intercomService } = await import('@/services/intercomService');
          await intercomService.update(user);
        } catch (error) {
          console.error('Intercom update failed:', error);
        }
      };
      
      // Defer updates to avoid blocking
      if ('requestIdleCallback' in window) {
        requestIdleCallback(updateUser, { timeout: 2000 });
      } else {
        setTimeout(updateUser, 1000);
      }
    }
  }, [user, isAuthenticated, isIntercomReady]);

  return null;
};