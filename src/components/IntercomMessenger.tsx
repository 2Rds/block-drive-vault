import { useEffect } from 'react';
import { intercomService, IntercomUser } from '@/services/intercomService';

interface IntercomMessengerProps {
  user?: IntercomUser;
  isAuthenticated?: boolean;
}

export const IntercomMessenger = ({ user, isAuthenticated }: IntercomMessengerProps) => {
  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize Intercom for authenticated users
      intercomService.boot(user);
    } else if (isAuthenticated === false) {
      // Initialize Intercom for anonymous users
      intercomService.initialize();
    }

    return () => {
      // Don't shutdown on unmount as Intercom should persist across route changes
    };
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Update user data when it changes
    if (isAuthenticated && user) {
      intercomService.update(user);
    }
  }, [user, isAuthenticated]);

  // This component doesn't render anything visible
  return null;
};