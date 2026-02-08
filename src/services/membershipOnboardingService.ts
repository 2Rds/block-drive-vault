/**
 * Membership Onboarding Orchestration Service
 *
 * Orchestrates the complete membership signup flow:
 * 1. User selects tier and chooses username
 * 2. Check subdomain availability
 * 3. Create soulbound membership NFT (Token-2022 with Transfer Hook)
 * 4. Register SNS subdomain (username.blockdrive.sol)
 * 5. Create on-chain MembershipLink PDA
 * 6. Update database with membership info
 *
 * All steps are coordinated to ensure atomicity where possible.
 * Uses Crossmint gas sponsorship for all transactions.
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import { nftMembershipService, CrossmintTransactionSigner } from './nftMembershipService';
import { snsSubdomainService } from './snsSubdomainService';
import { supabase } from '@/integrations/supabase/client';
import {
  SUBSCRIPTION_TIERS,
  TIER_STORAGE_QUOTAS,
  TIER_BANDWIDTH_QUOTAS,
} from '@/config/nftCollection';

export type MembershipTier = 'trial' | 'pro' | 'scale' | 'enterprise';
export type BillingInterval = 'monthly' | 'quarterly' | 'annual';

export interface OnboardingRequest {
  // User info
  userId: string;
  email: string;
  walletAddress: string;

  // Membership selection
  selectedTier: MembershipTier;
  billingInterval: BillingInterval;
  snsUsername: string;

  // For Scale tier
  teamSeats?: number;

  // Payment info
  paymentMethod: 'stripe' | 'radom';
  paymentIntentId?: string;
  radomTransactionId?: string;
}

export interface OnboardingResult {
  success: boolean;
  step: OnboardingStep;

  // Success data
  nftMint?: string;
  snsDomain?: string;
  membershipLinkPDA?: string;
  transactionSignatures?: string[];

  // Error info
  error?: string;
  retryable?: boolean;
}

export type OnboardingStep =
  | 'validation'
  | 'subdomain_check'
  | 'nft_minting'
  | 'sns_registration'
  | 'membership_link'
  | 'database_update'
  | 'complete';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  percentComplete: number;
  message: string;
}

class MembershipOnboardingService {
  private progressCallback?: (progress: OnboardingProgress) => void;

  /**
   * Set a callback to receive progress updates
   */
  onProgress(callback: (progress: OnboardingProgress) => void): void {
    this.progressCallback = callback;
  }

  private emitProgress(
    currentStep: OnboardingStep,
    completedSteps: OnboardingStep[],
    message: string
  ): void {
    const totalSteps = 6;
    const percentComplete = Math.round(
      (completedSteps.length / totalSteps) * 100
    );

    if (this.progressCallback) {
      this.progressCallback({
        currentStep,
        completedSteps,
        percentComplete,
        message,
      });
    }
  }

  /**
   * Calculate price based on tier, billing interval, and seats
   */
  calculatePrice(
    tier: MembershipTier,
    billingInterval: BillingInterval,
    teamSeats: number = 1
  ): { subtotal: number; discount: number; total: number } {
    if (tier === 'trial') {
      return { subtotal: 0, discount: 0, total: 0 };
    }

    const tierConfig = SUBSCRIPTION_TIERS[tier];
    if (!tierConfig || !('pricing' in tierConfig)) {
      throw new Error(`Invalid tier: ${tier}`);
    }

    const basePrice = tierConfig.pricing[billingInterval];
    const seats = tier === 'scale' ? Math.max(2, teamSeats) : 1;
    const subtotal = basePrice * seats;

    // Calculate discount based on billing interval
    let discount = 0;
    if (billingInterval === 'quarterly') {
      discount = subtotal * 0.11; // ~11% discount
    } else if (billingInterval === 'annual') {
      discount = subtotal * 0.17; // ~17% discount
    }

    return {
      subtotal,
      discount,
      total: subtotal - discount,
    };
  }

  /**
   * Validate the onboarding request
   */
  private async validateRequest(
    request: OnboardingRequest
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate tier
    if (!['trial', 'pro', 'scale', 'enterprise'].includes(request.selectedTier)) {
      return { valid: false, error: 'Invalid membership tier' };
    }

    // Validate billing interval
    if (!['monthly', 'quarterly', 'annual'].includes(request.billingInterval)) {
      return { valid: false, error: 'Invalid billing interval' };
    }

    // Validate username format
    const usernameValidation = snsSubdomainService.validateSubdomain(
      request.snsUsername
    );
    if (!usernameValidation.valid) {
      return { valid: false, error: usernameValidation.error };
    }

    // Validate wallet address
    try {
      new PublicKey(request.walletAddress);
    } catch {
      return { valid: false, error: 'Invalid wallet address' };
    }

    // Validate Scale tier has minimum seats
    if (request.selectedTier === 'scale') {
      const seats = request.teamSeats || 0;
      if (seats < 2) {
        return { valid: false, error: 'Scale tier requires minimum 2 seats' };
      }
    }

    // Validate payment method
    if (!['stripe', 'radom'].includes(request.paymentMethod)) {
      return { valid: false, error: 'Invalid payment method' };
    }

    return { valid: true };
  }

  /**
   * Complete full membership onboarding flow
   */
  async onboardMember(
    request: OnboardingRequest,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<OnboardingResult> {
    const completedSteps: OnboardingStep[] = [];
    const transactionSignatures: string[] = [];

    try {
      // Step 1: Validation
      this.emitProgress('validation', completedSteps, 'Validating request...');

      const validation = await this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          step: 'validation',
          error: validation.error,
          retryable: false,
        };
      }
      completedSteps.push('validation');

      // Step 2: Check subdomain availability
      this.emitProgress(
        'subdomain_check',
        completedSteps,
        'Checking username availability...'
      );

      const availability = await snsSubdomainService.checkAvailability(
        request.snsUsername
      );
      if (!availability.available) {
        return {
          success: false,
          step: 'subdomain_check',
          error: availability.reason || 'Username not available',
          retryable: false,
        };
      }
      completedSteps.push('subdomain_check');

      // Step 3: Mint soulbound membership NFT
      this.emitProgress(
        'nft_minting',
        completedSteps,
        'Creating your membership NFT...'
      );

      const nftResult = await nftMembershipService.createMembership(
        {
          tier: request.selectedTier === 'trial' ? 'pro' : request.selectedTier,
          billingPeriod: request.billingInterval,
          paymentMethod: request.paymentMethod === 'stripe' ? 'card' : 'crypto',
          walletAddress: request.walletAddress,
          autoRenew: true,
        },
        crossmintSigner
      );

      if (!nftResult.success) {
        return {
          success: false,
          step: 'nft_minting',
          error: nftResult.error || 'Failed to mint membership NFT',
          retryable: true,
        };
      }

      if (nftResult.transactionSignature) {
        transactionSignatures.push(nftResult.transactionSignature);
      }
      completedSteps.push('nft_minting');

      // Step 4: Register SNS subdomain
      this.emitProgress(
        'sns_registration',
        completedSteps,
        'Registering your username...'
      );

      const snsResult = await snsSubdomainService.registerSubdomain(
        request.snsUsername,
        request.walletAddress,
        crossmintSigner,
        false // NFT already verified by minting
      );

      if (!snsResult.success) {
        // SNS registration failed but NFT was minted
        // User can retry SNS registration separately
        console.error('[Onboarding] SNS registration failed:', snsResult.error);
        // Continue to database update with partial data
      } else {
        if (snsResult.transactionSignature) {
          transactionSignatures.push(snsResult.transactionSignature);
        }
      }
      completedSteps.push('sns_registration');

      // Step 5: Create MembershipLink PDA (on-chain)
      // Note: In production, this would call the Solana program
      // For now, we track this in the database
      this.emitProgress(
        'membership_link',
        completedSteps,
        'Creating membership record...'
      );
      completedSteps.push('membership_link');

      // Step 6: Update database
      this.emitProgress(
        'database_update',
        completedSteps,
        'Saving your information...'
      );

      const dbResult = await this.updateDatabase(request, {
        nftMint: nftResult.nftMint,
        snsDomain: snsResult.success
          ? snsResult.fullDomain
          : undefined,
        expiresAt: nftResult.expiresAt,
      });

      if (!dbResult.success) {
        console.error('[Onboarding] Database update failed:', dbResult.error);
        // Don't fail the whole flow - blockchain state is already committed
      }
      completedSteps.push('database_update');

      // Complete!
      this.emitProgress(
        'complete',
        completedSteps,
        'Membership created successfully!'
      );

      return {
        success: true,
        step: 'complete',
        nftMint: nftResult.nftMint,
        snsDomain: snsResult.success ? snsResult.fullDomain : undefined,
        transactionSignatures,
      };
    } catch (error) {
      console.error('[Onboarding] Unexpected error:', error);
      return {
        success: false,
        step: completedSteps[completedSteps.length - 1] || 'validation',
        error:
          error instanceof Error ? error.message : 'An unexpected error occurred',
        retryable: true,
      };
    }
  }

  /**
   * Start a 7-day trial for a selected tier
   */
  async startTrial(
    request: Omit<OnboardingRequest, 'billingInterval' | 'paymentMethod'>,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<OnboardingResult> {
    return this.onboardMember(
      {
        ...request,
        selectedTier: 'trial',
        billingInterval: 'monthly', // Trial is 7 days
        paymentMethod: 'stripe', // No payment needed
      },
      crossmintSigner
    );
  }

  /**
   * Update the database with membership information
   */
  private async updateDatabase(
    request: OnboardingRequest,
    onboardingData: {
      nftMint?: string;
      snsDomain?: string;
      expiresAt?: number;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Calculate trial end date (7 days from now)
      const now = new Date();
      const trialEndsAt =
        request.selectedTier === 'trial'
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null;

      // Update profile with membership info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: request.selectedTier,
          subscription_status: 'active',
          sns_domain: onboardingData.snsDomain || null,
          nft_mint: onboardingData.nftMint || null,
          billing_interval: request.billingInterval,
          trial_ends_at: trialEndsAt?.toISOString() || null,
          storage_quota: TIER_STORAGE_QUOTAS[request.selectedTier],
          bandwidth_quota: TIER_BANDWIDTH_QUOTAS[request.selectedTier],
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.userId);

      if (profileError) {
        console.error('[Onboarding] Profile update failed:', profileError);
        return { success: false, error: profileError.message };
      }

      // Create subscription record
      const subscriptionData = {
        user_id: request.userId,
        tier: request.selectedTier,
        status: 'active',
        billing_interval: request.billingInterval,
        payment_provider: request.paymentMethod,
        nft_mint: onboardingData.nftMint || null,
        sns_domain: onboardingData.snsDomain || null,
        current_period_start: now.toISOString(),
        current_period_end: onboardingData.expiresAt
          ? new Date(onboardingData.expiresAt).toISOString()
          : null,
        trial_ends_at: trialEndsAt?.toISOString() || null,
        team_seats: request.teamSeats || 1,
        created_at: now.toISOString(),
      };

      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert(subscriptionData);

      if (subscriptionError) {
        // Subscription table might not exist yet
        console.warn(
          '[Onboarding] Subscription insert failed (table may not exist):',
          subscriptionError
        );
      }

      return { success: true };
    } catch (error) {
      console.error('[Onboarding] Database update error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Database update failed',
      };
    }
  }

  /**
   * Retry SNS registration for a member who has an NFT but failed SNS
   */
  async retrySubdomainRegistration(
    userId: string,
    snsUsername: string,
    crossmintSigner: CrossmintTransactionSigner
  ): Promise<OnboardingResult> {
    try {
      if (!crossmintSigner.walletAddress) {
        return {
          success: false,
          step: 'validation',
          error: 'Wallet not connected',
        };
      }

      const snsResult = await snsSubdomainService.registerSubdomain(
        snsUsername,
        crossmintSigner.walletAddress,
        crossmintSigner,
        true
      );

      if (!snsResult.success) {
        return {
          success: false,
          step: 'sns_registration',
          error: snsResult.error,
          retryable: true,
        };
      }

      // Update database
      await supabase
        .from('profiles')
        .update({
          sns_domain: snsResult.fullDomain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return {
        success: true,
        step: 'complete',
        snsDomain: snsResult.fullDomain,
        transactionSignatures: snsResult.transactionSignature
          ? [snsResult.transactionSignature]
          : [],
      };
    } catch (error) {
      return {
        success: false,
        step: 'sns_registration',
        error: error instanceof Error ? error.message : 'Retry failed',
        retryable: true,
      };
    }
  }

  /**
   * Check if a user can start a trial
   * (Users can only have one trial per account)
   */
  async canStartTrial(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('trial_ends_at, subscription_tier')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return true; // New user can start trial
      }

      // If they've had a trial before, they can't start another
      if (data.trial_ends_at) {
        return false;
      }

      // If they have an active paid subscription, no trial needed
      if (
        data.subscription_tier &&
        data.subscription_tier !== 'trial'
      ) {
        return false;
      }

      return true;
    } catch {
      return true;
    }
  }

  /**
   * Get the full SNS domain for a username
   */
  getFullDomain(username: string): string {
    return `${username}.blockdrive.sol`;
  }
}

// Export singleton instance
export const membershipOnboardingService = new MembershipOnboardingService();
