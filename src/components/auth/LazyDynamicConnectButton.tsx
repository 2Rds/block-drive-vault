import React, { lazy, Suspense } from 'react';
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
  // Load Dynamic immediately on mount to prevent double-click issue
  return (
    <Suspense fallback={
      <Button disabled className="bg-primary/50 text-primary-foreground">
        <span className="animate-pulse">Initializing...</span>
      </Button>
    }>
      <DynamicConnectButton onConnectClick={onConnectClick} />
    </Suspense>
  );
};