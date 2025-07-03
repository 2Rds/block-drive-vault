
import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, UserPlus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DynamicWalletConnector } from './DynamicWalletConnector';
import { SignupForm } from './SignupForm';
import { AuthSecurity } from './AuthSecurity';
import { supabase } from '@/integrations/supabase/client';
import { SolanaSubdomainService } from '@/services/solanaSubdomainService';
import { toast } from 'sonner';

interface AuthConnectorsProps {
  dynamicReady: boolean;
  sdkError: boolean;
  sdkHasLoaded: boolean;
  onRetry: () => void;
  onWeb3MFASuccess: (authData: any) => void;
}

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  solanaSubdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(20, 'Subdomain must be less than 20 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
});

type SignupFormData = z.infer<typeof signupSchema>;

export const AuthConnectors = ({
  dynamicReady,
  sdkError,
  sdkHasLoaded,
  onRetry,
  onWeb3MFASuccess
}: AuthConnectorsProps) => {
  const [showSignup, setShowSignup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      solanaSubdomain: ''
    }
  });

  const handleSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Check subdomain availability first
      const isAvailable = await SolanaSubdomainService.checkSubdomainAvailability(data.solanaSubdomain);
      
      if (!isAvailable) {
        toast.error('This subdomain is already taken. Please choose another.');
        setIsSubmitting(false);
        return;
      }

      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.fullName,
            username: data.solanaSubdomain
          }
        }
      });

      if (authError) {
        console.error('Sign up error:', authError);
        toast.error(authError.message || 'Failed to create account');
        setIsSubmitting(false);
        return;
      }

      if (authData.user) {
        // Register the Solana subdomain
        const subdomainResult = await SolanaSubdomainService.registerSubdomain(
          data.solanaSubdomain,
          '', // Will be filled when wallet is connected
          authData.user.id
        );

        if (subdomainResult.success) {
          toast.success('Account created successfully! Please check your email to verify your account.');
          setShowSignup(false);
          form.reset();
        } else {
          toast.error(subdomainResult.error || 'Failed to register subdomain');
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card/40 border border-border rounded-xl p-6">
        <h3 className="text-xl font-semibold text-card-foreground mb-4 text-center">
          Connect Your Solana Wallet
        </h3>
        
        {/* SDK Status Messages */}
        {!dynamicReady && !sdkError && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="text-primary text-sm">
                Initializing Solana wallet connections...
              </span>
            </div>
          </div>
        )}

        {sdkError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h4 className="text-destructive font-semibold mb-1">Connection Issue</h4>
                <p className="text-muted-foreground text-sm mb-3">
                  Unable to connect to Solana wallet services. This might be caused by network issues or firewall restrictions.
                </p>
                <button 
                  onClick={onRetry} 
                  className="flex items-center space-x-2 bg-destructive hover:bg-destructive/80 text-destructive-foreground px-3 py-1.5 rounded text-sm transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Wallet Connector */}
        {dynamicReady && !sdkError && (
          <div className="mb-6">
            <DynamicWalletConnector onWalletConnected={() => {}} />
            {sdkHasLoaded && (
              <div className="text-center mt-2">
                <p className="text-primary text-xs">✓ Solana wallet services ready</p>
              </div>
            )}
          </div>
        )}

        {/* Sign Up / Sign In Toggle */}
        <div className="flex items-center justify-center space-x-4 mt-6">
          <Button
            variant={!showSignup ? "default" : "outline"}
            onClick={() => setShowSignup(false)}
            className="flex items-center space-x-2"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect Wallet</span>
          </Button>
          <Button
            variant={showSignup ? "default" : "outline"}
            onClick={() => setShowSignup(true)}
            className="flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up</span>
          </Button>
        </div>
      </div>

      {/* Sign Up Form */}
      {showSignup && (
        <SignupForm
          form={form}
          onSubmit={handleSignup}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Security Information */}
      <AuthSecurity />
    </div>
  );
};
