import { SignIn as ClerkSignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Zap } from 'lucide-react';

const CLERK_APPEARANCE = {
  elements: {
    rootBox: 'mx-auto w-full',
    card: 'bg-card border border-border shadow-2xl rounded-xl',
    headerTitle: 'text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButton: 'border-border hover:bg-accent/50',
    socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground',
    formFieldInput: 'bg-background border-border text-foreground',
    formButtonPrimary: 'bg-primary hover:bg-primary/90',
    footerActionLink: 'text-primary hover:text-primary/80',
    dividerLine: 'bg-border',
    dividerText: 'text-muted-foreground',
  },
};

export default function SignIn(): JSX.Element | null {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  if (isLoaded && isSignedIn) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Welcome to <span className="text-primary">BlockDrive</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            The private data management platform with theft-proof architecture and zero-knowledge encryption.
          </p>
          
          <div className="space-y-6 text-left">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Theft-Proof Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Files are split across providers and can never be stolen—even by us.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Zero-Knowledge Encryption</h3>
                <p className="text-sm text-muted-foreground">
                  Wallet-derived keys ensure only you can access your data.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Instant-Revoke Sharing</h3>
                <p className="text-sm text-muted-foreground">
                  Share files securely with instant access revocation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to <span className="text-primary">BlockDrive</span>
            </h1>
            <p className="text-muted-foreground">Sign in to continue</p>
          </div>
          
          <ClerkSignIn
            appearance={CLERK_APPEARANCE}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
          />
        </div>
      </div>
    </div>
  );
}
