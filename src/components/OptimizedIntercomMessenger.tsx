import { useEffect } from 'react';
import Intercom from '@intercom/messenger-js-sdk';

interface IntercomBootProps {
  userId?: string;
  email?: string;
  name?: string;
  createdAt?: number;
  isAuthenticated?: boolean;
}

export const OptimizedIntercomMessenger = ({ userId, email, name, createdAt, isAuthenticated }: IntercomBootProps) => {
  useEffect(() => {
    console.log('[Intercom] Booting, authenticated:', isAuthenticated, 'userId:', userId);
    try {
      if (isAuthenticated && userId) {
        Intercom({
          app_id: 'jdnu2ajy',
          user_id: userId,
          name,
          email,
          created_at: createdAt,
        });
      } else {
        Intercom({
          app_id: 'jdnu2ajy',
        });
      }
      console.log('[Intercom] Boot successful');
    } catch (error) {
      console.error('[Intercom] Boot failed:', error);
    }
  }, [userId, email, name, createdAt, isAuthenticated]);

  return null;
};
