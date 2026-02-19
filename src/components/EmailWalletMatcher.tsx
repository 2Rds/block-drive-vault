// Stub - EmailWalletMatcher deprecated with Dynamic auth
import React from 'react';

interface EmailWalletMatcherProps {
  onSuccess?: () => void;
}

export const EmailWalletMatcher = ({ onSuccess }: EmailWalletMatcherProps) => {
  // This component is deprecated with Dynamic authentication
  React.useEffect(() => {
    console.warn('EmailWalletMatcher is deprecated. Use Dynamic authentication.');
  }, []);
  
  return null;
};
