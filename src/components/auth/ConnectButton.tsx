/**
 * Auth connect button.
 * Shows sign-in/sign-up when logged out, dashboard + user menu when logged in.
 */

import { useIsLoggedIn, useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserButton } from './UserButton';

interface ConnectButtonProps {
  variant?: 'default' | 'hero';
}

export function ConnectButton({ variant = 'default' }: ConnectButtonProps) {
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const { sdkHasLoaded, setShowAuthFlow } = useDynamicContext();

  if (!sdkHasLoaded) {
    return (
      <Button disabled variant={variant === 'hero' ? 'default' : 'outline'} size="lg">
        Loading...
      </Button>
    );
  }

  if (variant === 'hero') {
    return isLoggedIn ? (
      <Button
        size="lg"
        className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        onClick={() => navigate('/dashboard')}
      >
        Go to Dashboard
      </Button>
    ) : (
      <Button
        size="lg"
        className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
        onClick={() => setShowAuthFlow(true)}
      >
        <LogIn className="w-5 h-5 mr-2" />
        Start Free Trial
      </Button>
    );
  }

  return isLoggedIn ? (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={() => navigate('/dashboard')}>
        Dashboard
      </Button>
      <UserButton />
    </div>
  ) : (
    <Button
      variant="ghost"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => setShowAuthFlow(true)}
    >
      Sign In
    </Button>
  );
}
