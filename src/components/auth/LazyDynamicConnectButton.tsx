import React, { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const handleClick = () => {
    setShowDynamic(true);
    onConnectClick();
  };

  const handleFallbackNavigation = () => {
    // Navigate to pricing page where Dynamic context is available
    navigate('/pricing');
  };

  if (showDynamic) {
    return (
      <Suspense fallback={
        <Button disabled>
          Loading...
        </Button>
      }>
        <DynamicConnectButton onConnectClick={handleFallbackNavigation} />
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