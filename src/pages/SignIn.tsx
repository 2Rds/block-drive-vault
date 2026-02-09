import { SignIn as ClerkSignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Zap } from 'lucide-react';
import { GradientOrb } from '@/components/effects/GradientOrb';
import { GridPattern } from '@/components/effects/GridPattern';

export default function SignIn(): JSX.Element | null {
  const { isSignedIn, isLoaded } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  if (isLoaded && isSignedIn) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex">
      {/* Left side - Cinematic Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden">
        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-[#0a0a0b] to-purple-950/30" />
        <GridPattern className="absolute inset-0 opacity-[0.025]" />
        <GradientOrb color="blue" size="xl" className="top-[-100px] left-[-50px] opacity-40" />
        <GradientOrb color="purple" size="lg" className="bottom-[10%] right-[-50px] opacity-30" animationDelay="2s" />

        <div className="max-w-md text-center relative z-10">
          <h1 className="text-4xl font-display font-bold mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              BlockDrive
            </span>
          </h1>
          <p className="text-lg text-zinc-400 mb-12">
            The private data management platform where breached data is worthless—files never exist complete at any single point.
          </p>

          <div className="space-y-6 text-left">
            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Shield className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Programmed Incompleteness</h3>
                <p className="text-sm text-zinc-500">
                  Files are split across providers—even if breached, the data is incomplete and useless.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Zero-Knowledge Encryption</h3>
                <p className="text-sm text-zinc-500">
                  Wallet-derived keys ensure only you can access your data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm rounded-xl p-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-200">Instant-Revoke Sharing</h3>
                <p className="text-sm text-zinc-500">
                  Share files internally with other BlockDrive users and revoke access instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to <span className="text-primary">BlockDrive</span>
            </h1>
            <p className="text-muted-foreground">Sign in to continue</p>
          </div>

          <ClerkSignIn
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
