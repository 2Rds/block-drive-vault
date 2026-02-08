/**
 * OrganizationJoinStep Component
 *
 * Onboarding step for joining an organization via:
 * 1. Invite Code - Enter organization-specific code
 * 2. Business Email - Verify via magic link to business email domain
 * 3. Skip - Continue without joining an organization
 */

import { useState, useEffect, useCallback } from 'react';
import { useOrgInviteCode, OrganizationContext } from '@/hooks/useOrgInviteCode';
import { useOrgEmailVerification } from '@/hooks/useOrgEmailVerification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  KeyRound,
  Mail,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface OrganizationJoinStepProps {
  onComplete: (orgContext: OrganizationContext | null) => void;
  onSkip: () => void;
}

export function OrganizationJoinStep({ onComplete, onSkip }: OrganizationJoinStepProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'email'>('code');

  // Invite code hook
  const {
    validateCode,
    useCode,
    formatCode,
    isValidating: isValidatingCode,
    isUsing: isUsingCode,
    validationResult,
    organization: codeOrganization,
    error: codeError,
    reset: resetCode,
  } = useOrgInviteCode();

  // Email verification hook
  const {
    checkEmail,
    sendVerification,
    resendVerification,
    status: emailStatus,
    emailCheckResult,
    organization: emailOrganization,
    error: emailError,
    isLoading: isEmailLoading,
    canResend,
    getResendCooldown,
    reset: resetEmail,
  } = useOrgEmailVerification();

  // Local state
  const [inviteCode, setInviteCode] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Update resend cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setResendCooldown(getResendCooldown());
    }, 1000);
    return () => clearInterval(interval);
  }, [getResendCooldown]);

  // Handle invite code input with formatting
  const handleCodeChange = useCallback((value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setInviteCode(formatted);

    // Auto-validate when code looks complete (has dashes and sufficient length)
    if (formatted.length >= 12 && formatted.includes('-')) {
      validateCode(formatted);
    }
  }, [validateCode]);

  // Handle using invite code
  const handleUseCode = async () => {
    const result = await useCode(inviteCode);
    if (result.success && codeOrganization) {
      onComplete(codeOrganization);
    }
  };

  // Handle email check
  const handleCheckEmail = async () => {
    const result = await checkEmail(businessEmail);
    if (result.hasOrganization && result.requiresVerification) {
      // Automatically send verification
      await sendVerification(businessEmail);
    }
  };

  // Handle email verification complete
  useEffect(() => {
    if (emailStatus === 'verified' && emailOrganization) {
      onComplete(emailOrganization);
    }
  }, [emailStatus, emailOrganization, onComplete]);

  // Reset when switching tabs
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as 'code' | 'email');
    if (tab === 'code') {
      resetEmail();
    } else {
      resetCode();
      setInviteCode('');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Join an Organization?</h2>
        <p className="text-muted-foreground text-sm mt-2">
          If you have an organization invite code or business email, enter it below.
          Otherwise, you can skip this step.
        </p>
      </div>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code" className="gap-2">
            <KeyRound className="w-4 h-4" />
            Invite Code
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="w-4 h-4" />
            Business Email
          </TabsTrigger>
        </TabsList>

        {/* Invite Code Tab */}
        <TabsContent value="code" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Organization Invite Code
              </label>
              <Input
                type="text"
                placeholder="ACME-2026-X7K9M2"
                value={inviteCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="font-mono text-center text-lg tracking-widest uppercase"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Enter the code provided by your organization
              </p>
            </div>

            {/* Validation Status */}
            {isValidatingCode && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating code...
              </div>
            )}

            {/* Valid Code - Show Organization Preview */}
            {validationResult?.valid && validationResult.organization && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {validationResult.organization.imageUrl ? (
                    <img
                      src={validationResult.organization.imageUrl}
                      alt={validationResult.organization.name}
                      className="w-10 h-10 rounded-lg"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-green-500">
                      {validationResult.organization.name}
                    </p>
                    <p className="text-xs text-green-500/70 font-mono">
                      {validationResult.organization.subdomain}.blockdrive.sol
                    </p>
                  </div>
                </div>
                <p className="text-sm text-green-600">
                  You'll join as: <span className="font-medium">{validationResult.defaultRole}</span>
                </p>
              </div>
            )}

            {/* Invalid Code */}
            {validationResult && !validationResult.valid && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {validationResult.error || 'Invalid or expired code'}
              </div>
            )}

            {/* Error */}
            {codeError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {codeError}
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleUseCode}
              disabled={!validationResult?.valid || isUsingCode}
              className="w-full"
            >
              {isUsingCode ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining Organization...
                </>
              ) : (
                <>
                  Join Organization
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Business Email Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="space-y-3">
            {emailStatus === 'idle' || emailStatus === 'checking' || emailStatus === 'error' ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Business Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value.toLowerCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    If your company uses BlockDrive, we'll detect it automatically
                  </p>
                </div>

                {/* Error */}
                {emailError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {emailError}
                  </div>
                )}

                <Button
                  onClick={handleCheckEmail}
                  disabled={!businessEmail || !businessEmail.includes('@') || isEmailLoading}
                  className="w-full"
                >
                  {emailStatus === 'checking' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Check Email Domain
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </>
            ) : emailStatus === 'found' || emailStatus === 'sending' ? (
              <>
                {/* Organization Found */}
                {emailCheckResult?.organization && (
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {emailCheckResult.organization.imageUrl ? (
                        <img
                          src={emailCheckResult.organization.imageUrl}
                          alt={emailCheckResult.organization.name}
                          className="w-10 h-10 rounded-lg"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-primary">
                          {emailCheckResult.organization.name}
                        </p>
                        <p className="text-xs text-primary/70 font-mono">
                          {emailCheckResult.organization.subdomain}.blockdrive.sol
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-primary mb-2" />
                  Sending verification email to <strong>{businessEmail}</strong>...
                </div>
              </>
            ) : emailStatus === 'pending' ? (
              <>
                {/* Verification Pending */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center space-y-3">
                  <Mail className="w-10 h-10 mx-auto text-amber-500" />
                  <div>
                    <p className="font-semibold text-amber-600">Check Your Email</p>
                    <p className="text-sm text-amber-600/80 mt-1">
                      We've sent a verification link to <strong>{businessEmail}</strong>
                    </p>
                  </div>
                </div>

                {emailCheckResult?.organization && (
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {emailCheckResult.organization.name}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {emailCheckResult.organization.subdomain}.blockdrive.sol
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Click the link in the email to verify and join the organization.
                  The link expires in 24 hours.
                </p>

                <Button
                  onClick={resendVerification}
                  disabled={!canResend() || isEmailLoading}
                  variant="outline"
                  className="w-full"
                >
                  {resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Resend Verification Email
                    </>
                  )}
                </Button>
              </>
            ) : emailStatus === 'verified' ? (
              <>
                {/* Verification Complete */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-green-500" />
                  <div>
                    <p className="font-semibold text-green-600">Email Verified!</p>
                    <p className="text-sm text-green-600/80 mt-1">
                      You've joined {emailOrganization?.name}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      {/* Skip Button */}
      <div className="pt-2 border-t border-border">
        <Button onClick={onSkip} variant="ghost" className="w-full text-muted-foreground">
          Skip - Continue without an organization
        </Button>
      </div>
    </div>
  );
}
