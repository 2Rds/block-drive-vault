import { SignedIn, SignedOut, UserButton, SignInButton, useClerk } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ClerkConnectButtonProps {
  variant?: 'default' | 'hero';
}

export const ClerkConnectButton = ({ variant = 'default' }: ClerkConnectButtonProps) => {
  const navigate = useNavigate();
  const { loaded } = useClerk();

  if (!loaded) {
    return (
      <Button disabled variant={variant === 'hero' ? 'default' : 'outline'} size="lg">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (variant === 'hero') {
    return (
      <>
        <SignedOut>
          <Button 
            size="lg" 
            className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            onClick={() => navigate('/sign-up')}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Get Started Free
          </Button>
        </SignedOut>
        <SignedIn>
          <Button 
            size="lg" 
            className="text-lg px-10 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
            onClick={() => navigate('/dashboard')}
          >
            Go to Dashboard
          </Button>
        </SignedIn>
      </>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/sign-in')}
          >
            Sign In
          </Button>
          <Button 
            variant="default"
            onClick={() => navigate('/sign-up')}
          >
            Get Started
          </Button>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </Button>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: 'w-9 h-9',
                userButtonPopoverCard: 'bg-card border border-border',
                userButtonPopoverActionButton: 'text-foreground hover:bg-accent',
                userButtonPopoverActionButtonText: 'text-foreground',
                userButtonPopoverFooter: 'hidden',
              }
            }}
          />
        </div>
      </SignedIn>
    </>
  );
};
