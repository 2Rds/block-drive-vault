// Stub - EmailWalletMatcher deprecated with Clerk auth
import React from 'react';

interface EmailWalletMatcherProps {
  onSuccess?: () => void;
}

export const EmailWalletMatcher = ({ onSuccess }: EmailWalletMatcherProps) => {
  // This component is deprecated with Clerk authentication
  React.useEffect(() => {
    console.warn('EmailWalletMatcher is deprecated. Use Clerk authentication.');
  }, []);
  
  return null;
};
