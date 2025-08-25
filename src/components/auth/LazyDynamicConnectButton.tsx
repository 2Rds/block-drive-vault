import React, { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';

// Lazy load the actual DynamicConnectButton to reduce initial bundle size
const DynamicConnectButton = lazy(() => 
  import('./DynamicConnectButton').then(m => ({ default: m.DynamicConnectButton }))
);

interface LazyDynamicConnectButtonProps {
  onConnectClick: () => void;
}

export const LazyDynamicConnectButton: React.FC<LazyDynamicConnectButtonProps> = ({ 
  onConnectClick 
}) => {
  const [showDynamic, setShowDynamic] = useState(false);

  const handleClick = () => {
    setShowDynamic(true);
    onConnectClick();
  };

  if (showDynamic) {
    return (
      <Suspense fallback={
        <Button disabled>
          Loading...
        </Button>
      }>
        <DynamicConnectButton onConnectClick={onConnectClick} />
      </Suspense>
    );
  }

  return (
    <Button 
      onClick={handleClick}
      className="bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      Connect Wallet
    </Button>
  );
};