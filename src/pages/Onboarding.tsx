import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useUsernameNFT } from '@/hooks/useUsernameNFT';
import { useCrossmintWallet } from '@/hooks/useCrossmintWallet';
import { OrganizationJoinStep, OrganizationContext } from '@/components/onboarding/OrganizationJoinStep';
import { Loader2, CheckCircle2, Wallet, Sparkles, AlertCircle, User, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type OnboardingStep = 'loading' | 'organization' | 'username' | 'wallet' | 'minting' | 'complete' | 'error';
type StepStatus = 'pending' | 'current' | 'complete';

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 20;
const REDIRECT_DELAY_MS = 1500;
const FAST_REDIRECT_DELAY_MS = 500;

function getStepStatus(stepName: string, currentStep: OnboardingStep, isCompleted: boolean): StepStatus {
  if (currentStep === stepName) return 'current';
  if (isCompleted) return 'complete';
  return 'pending';
}

function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < USERNAME_MIN_LENGTH) return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  if (username.length > USERNAME_MAX_LENGTH) return `Username must be ${USERNAME_MAX_LENGTH} characters or less`;
  if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) {
    return 'Only letters, numbers, and underscores allowed';
  }
  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { hasUsernameNFT, isLoading: isLoadingNFT, mintUsername, isMinting } = useUsernameNFT();
  const { walletAddress, isLoading: isLoadingWallet, isInitialized: isWalletReady } = useCrossmintWallet();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('loading');
  const [mintAttempted, setMintAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Organization context - set when user joins via email domain auto-detect
  const [organizationContext, setOrganizationContext] = useState<OrganizationContext | null>(null);
  const [orgStepCompleted, setOrgStepCompleted] = useState(false);

  // Username state - for users who didn't set one during signup (e.g., MetaMask)
  const [inputUsername, setInputUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  // Get the username from Clerk or use the one entered in onboarding
  const clerkUsername = user?.username;
  const [confirmedUsername, setConfirmedUsername] = useState<string | null>(null);
  const effectiveUsername = confirmedUsername || clerkUsername;

  // Handle username confirmation for users who didn't set one in Clerk
  const handleConfirmUsername = async () => {
    const validationError = validateUsername(inputUsername);
    if (validationError) {
      setUsernameError(validationError);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError(null);

    try {
      // Check if username is available via the NFT service
      const { checkUsernameAvailability } = await import('@/services/crossmint/usernameNFTService');
      const result = await checkUsernameAvailability(inputUsername.toLowerCase());

      if (!result.available) {
        setUsernameError(result.error || 'Username is already taken');
        setIsCheckingUsername(false);
        return;
      }

      // Username is valid and available
      setConfirmedUsername(inputUsername.toLowerCase());
    } catch (err) {
      console.error('[Onboarding] Error checking username:', err);
      setUsernameError('Failed to check username availability');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Build the full domain string based on organization context
  const getFullDomain = useCallback(() => {
    if (organizationContext && effectiveUsername) {
      return `${effectiveUsername}.${organizationContext.subdomain}.blockdrive.sol`;
    }
    return effectiveUsername ? `${effectiveUsername}.blockdrive.sol` : '';
  }, [effectiveUsername, organizationContext]);

  // Auto-mint NFT when wallet is ready and we have a username
  const handleAutoMint = useCallback(async () => {
    if (!effectiveUsername || mintAttempted || isMinting || hasUsernameNFT) return;

    setMintAttempted(true);
    setCurrentStep('minting');

    // Pass organization context to mint function
    const result = await mintUsername(effectiveUsername, {
      organizationId: organizationContext?.id,
      organizationSubdomain: organizationContext?.subdomain,
    });

    if (result.success) {
      const fullDomain = getFullDomain();
      toast.success(`Successfully claimed ${fullDomain}!`);
      setCurrentStep('complete');
      setTimeout(() => navigate('/dashboard'), REDIRECT_DELAY_MS);
    } else {
      console.error('[Onboarding] Mint failed:', result.error);
      setError(result.error || 'Failed to mint username NFT');
      setCurrentStep('error');
    }
  }, [effectiveUsername, mintAttempted, isMinting, hasUsernameNFT, mintUsername, navigate, organizationContext, getFullDomain]);

  // Handle organization step completion
  const handleOrgComplete = useCallback((orgContext: OrganizationContext | null) => {
    setOrganizationContext(orgContext);
    setOrgStepCompleted(true);
  }, []);

  // Handle organization step skip
  const handleOrgSkip = useCallback(() => {
    setOrganizationContext(null);
    setOrgStepCompleted(true);
  }, []);

  // Determine current step based on state
  useEffect(() => {
    // Don't change step while checking username or during mint
    if (isCheckingUsername || isMinting) return;

    if (!isLoaded || isLoadingNFT || isLoadingWallet) {
      setCurrentStep('loading');
      return;
    }

    if (!isSignedIn) {
      navigate('/sign-in');
      return;
    }

    // Already has NFT - go to dashboard
    if (hasUsernameNFT) {
      setCurrentStep('complete');
      setTimeout(() => navigate('/dashboard'), FAST_REDIRECT_DELAY_MS);
      return;
    }

    // Step 1: Organization (optional) - only show if not yet completed
    if (!orgStepCompleted) {
      setCurrentStep('organization');
      return;
    }

    // Step 2: Check if we need username input (user didn't set one in Clerk)
    if (!effectiveUsername) {
      setCurrentStep('username');
      return;
    }

    // Step 3: Check if wallet is ready
    if (!isWalletReady && !walletAddress) {
      setCurrentStep('wallet');
      return;
    }

    // Step 4: Wallet ready, username available - auto-mint
    if (effectiveUsername && !mintAttempted && !isMinting) {
      handleAutoMint();
    }
  }, [
    isLoaded,
    isSignedIn,
    isLoadingNFT,
    isLoadingWallet,
    isWalletReady,
    walletAddress,
    hasUsernameNFT,
    effectiveUsername,
    mintAttempted,
    isMinting,
    isCheckingUsername,
    orgStepCompleted,
    handleAutoMint,
    navigate,
  ]);

  const handleRetry = () => {
    setMintAttempted(false);
    setError(null);
    setCurrentStep('loading');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  // Redirect if not signed in
  if (isLoaded && !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex flex-col items-center justify-center p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome to <span className="text-primary">BlockDrive</span>
        </h1>
        <p className="text-muted-foreground">
          {user?.firstName ? `Hey ${user.firstName}! ` : ''}
          Let's get you set up
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-1 sm:gap-2 mb-8 overflow-x-auto">
        <StepIndicator number={1} label="Sign Up" status="complete" />
        <StepDivider />
        <StepIndicator
          number={2}
          label="Username"
          status={getStepStatus('username', currentStep, Boolean(effectiveUsername))}
        />
        <StepDivider />
        <StepIndicator
          number={3}
          label="Wallet"
          status={getStepStatus('wallet', currentStep, isWalletReady || Boolean(walletAddress))}
        />
        <StepDivider />
        <StepIndicator
          number={4}
          label="NFT"
          status={getStepStatus('minting', currentStep, hasUsernameNFT || currentStep === 'complete')}
        />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-lg">
        {currentStep === 'loading' && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Setting up your account...</p>
          </div>
        )}

        {currentStep === 'organization' && (
          <OrganizationJoinStep
            onComplete={handleOrgComplete}
            onSkip={handleOrgSkip}
          />
        )}

        {currentStep === 'username' && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Choose Your Username</h2>
              <p className="text-muted-foreground text-sm mt-2">
                This will be your unique BlockDrive identity
              </p>
            </div>

            {/* Organization Context Preview */}
            {organizationContext && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-3">
                <Building2 className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-primary">
                    {organizationContext.name}
                  </p>
                  <p className="text-xs text-primary/70">
                    Your username will be part of this organization
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="username"
                  value={inputUsername}
                  onChange={(e) => {
                    setInputUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                    setUsernameError(null);
                  }}
                  className={`font-mono ${organizationContext ? 'pr-44' : 'pr-32'}`}
                  maxLength={USERNAME_MAX_LENGTH}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono truncate max-w-[160px]">
                  {organizationContext
                    ? `.${organizationContext.subdomain}.blockdrive.sol`
                    : '.blockdrive.sol'}
                </span>
              </div>

              {usernameError && (
                <p className="text-destructive text-sm">{usernameError}</p>
              )}

              <p className="text-xs text-muted-foreground">
                {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} characters, letters, numbers, and underscores only
              </p>

              <Button
                onClick={handleConfirmUsername}
                disabled={!inputUsername || isCheckingUsername}
                className="w-full"
              >
                {isCheckingUsername ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking availability...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'wallet' && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Creating Your Wallet</h2>
            <p className="text-muted-foreground text-sm">
              We're setting up your secure Solana wallet. This only takes a moment...
            </p>
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {currentStep === 'minting' && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-semibold">Creating Your SNS Domain</h2>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="font-mono text-primary font-semibold text-sm sm:text-base break-all">
                {getFullDomain()}
              </p>
            </div>
            {organizationContext && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>Part of {organizationContext.name}</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              Registering your SNS subdomain and minting your soulbound membership NFT on Solana...
            </p>
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold">All Set!</h2>
            {effectiveUsername && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="font-mono text-green-500 font-semibold text-sm sm:text-base break-all">
                  {getFullDomain()}
                </p>
              </div>
            )}
            {organizationContext && (
              <div className="flex items-center justify-center gap-2 text-sm text-green-600">
                <Building2 className="w-4 h-4" />
                <span>Welcome to {organizationContext.name}!</span>
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              Redirecting you to your dashboard...
            </p>
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          </div>
        )}

        {currentStep === 'error' && (
          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Something Went Wrong</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} variant="default">
                Try Again
              </Button>
              <Button onClick={handleSkip} variant="ghost">
                Skip for Now
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDivider(): JSX.Element {
  return <div className="w-3 sm:w-6 h-0.5 bg-border flex-shrink-0" />;
}

interface StepIndicatorProps {
  number: number;
  label: string;
  status: StepStatus;
}

function StepIndicator({ number, label, status }: StepIndicatorProps): JSX.Element {
  const circleClass = (() => {
    switch (status) {
      case 'complete':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  })();

  const labelClass = status === 'current'
    ? 'text-foreground font-medium'
    : 'text-muted-foreground';

  return (
    <div className="flex flex-col items-center">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${circleClass}`}>
        {status === 'complete' ? <CheckCircle2 className="w-4 h-4" /> : number}
      </div>
      <span className={`text-xs mt-1 ${labelClass}`}>{label}</span>
    </div>
  );
}
