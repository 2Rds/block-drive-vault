import { SignUp as ClerkSignUp, useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, FileText, Users } from 'lucide-react';

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

export default function SignUp(): JSX.Element | null {
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
            Join <span className="text-primary">BlockDrive</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-12">
            Start your 7-day free trial and experience the future of private data management.
          </p>
          
          <div className="space-y-6 text-left">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Enterprise Security</h3>
                <p className="text-sm text-muted-foreground">
                  Military-grade encryption protects your sensitive data.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Unlimited Files</h3>
                <p className="text-sm text-muted-foreground">
                  Store any file type with no size restrictions.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Work together with secure file sharing and permissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign Up Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Join <span className="text-primary">BlockDrive</span>
            </h1>
            <p className="text-muted-foreground">Create your account</p>
          </div>
          
          <ClerkSignUp
            appearance={CLERK_APPEARANCE}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/onboarding"
          />
        </div>
      </div>
    </div>
  );
}
