import { useEffect, useState } from 'react';
import { intercomService, IntercomUser } from '@/services/intercomService';

interface IntercomMessengerProps {
  user?: IntercomUser;
  isAuthenticated?: boolean;
}

export const IntercomMessenger = ({ user, isAuthenticated }: IntercomMessengerProps) => {
  const [isIntercomReady, setIsIntercomReady] = useState(false);

  useEffect(() => {
    // Defer Intercom initialization to reduce initial JavaScript execution time
    const initializeIntercom = () => {
      if (isAuthenticated && user) {
        // Initialize Intercom for authenticated users
        intercomService.boot(user);
      } else if (isAuthenticated === false) {
        // Initialize Intercom for anonymous users
        intercomService.initialize();
      }
      setIsIntercomReady(true);
    };

    // Use requestIdleCallback to defer Intercom loading until browser is idle
    // This prevents blocking the main thread during critical page load
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initializeIntercom, { timeout: 3000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(initializeIntercom, 2000);
    }

    return () => {
      // Don't shutdown on unmount as Intercom should persist across route changes
    };
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Update user data when it changes, but only after Intercom is ready
    if (isIntercomReady && isAuthenticated && user) {
      intercomService.update(user);
    }
  }, [user, isAuthenticated, isIntercomReady]);

  // This component doesn't render anything visible
  return null;
};