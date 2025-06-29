
import { supabase } from '@/integrations/supabase/client';
import { BaseAuthService } from './baseAuthService';
import { BaseSubdomainService } from './baseSubdomainService';
import { toast } from 'sonner';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: string;
}

export interface OnboardingStatus {
  isNewUser: boolean;
  hasNFT: boolean;
  hasSubdomain: boolean;
  isComplete: boolean;
  nextStep?: OnboardingStep;
  steps: OnboardingStep[];
}

export class BaseOnboardingService {
  /**
   * Check user's onboarding status
   */
  static async checkOnboardingStatus(walletAddress: string): Promise<OnboardingStatus> {
    try {
      // Check if user exists in our system
      const { data: existingUser, error: userError } = await supabase
        .from('blockdrive_nfts')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('blockchain_type', 'ethereum')
        .eq('is_active', true)
        .maybeSingle();

      const isNewUser = !existingUser;

      // Check NFT ownership
      const nftVerification = await BaseAuthService.verifySoulboundNFT(walletAddress);
      const hasNFT = nftVerification.hasNFT;

      // Check subdomain ownership
      const subdomainVerification = await BaseAuthService.verifyBaseSubdomain(walletAddress);
      const hasSubdomain = subdomainVerification.hasSubdomain;

      const isComplete = hasNFT && hasSubdomain;

      const steps: OnboardingStep[] = [
        {
          id: 'mint-nft',
          title: 'Mint Base Soulbound NFT',
          description: 'Get your free authentication NFT from Collectify launchpad',
          completed: hasNFT,
          action: 'mint'
        },
        {
          id: 'create-subdomain',
          title: 'Create Base Subdomain',
          description: 'Register your blockdrive.eth subdomain',
          completed: hasSubdomain,
          action: 'subdomain'
        }
      ];

      const nextStep = steps.find(step => !step.completed);

      return {
        isNewUser,
        hasNFT,
        hasSubdomain,
        isComplete,
        nextStep,
        steps
      };

    } catch (error: any) {
      console.error('Onboarding status check error:', error);
      return {
        isNewUser: true,
        hasNFT: false,
        hasSubdomain: false,
        isComplete: false,
        steps: []
      };
    }
  }

  /**
   * Process new user onboarding
   */
  static async processNewUser(walletAddress: string): Promise<{
    success: boolean;
    requiresNFT?: boolean;
    requiresSubdomain?: boolean;
    redirectToMint?: boolean;
    error?: string;
  }> {
    try {
      console.log('Processing new user onboarding:', walletAddress);

      const status = await this.checkOnboardingStatus(walletAddress);

      if (status.isComplete) {
        return { success: true };
      }

      if (!status.hasNFT) {
        // Redirect to Collectify launchpad for NFT minting
        BaseAuthService.redirectToSoulboundNFTMint();
        toast.info('Welcome! Please mint your free Base soulbound NFT to get started.');
        
        return {
          success: false,
          requiresNFT: true,
          redirectToMint: true
        };
      }

      if (!status.hasSubdomain) {
        toast.info('Great! Now create your blockdrive.eth subdomain to complete setup.');
        return {
          success: false,
          requiresSubdomain: true
        };
      }

      return { success: true };

    } catch (error: any) {
      console.error('New user processing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process new user'
      };
    }
  }

  /**
   * Complete onboarding after both steps are done
   */
  static async completeOnboarding(walletAddress: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const status = await this.checkOnboardingStatus(walletAddress);
      
      if (!status.isComplete) {
        return {
          success: false,
          error: 'Onboarding not complete. Please ensure you have both NFT and subdomain.'
        };
      }

      // Create user session with full 2FA
      const authResult = await BaseAuthService.authenticateWithBase2FA(
        walletAddress,
        `onboarding-${Date.now()}`,
        'Complete Base 2FA onboarding'
      );

      if (authResult.success) {
        toast.success('🎉 Base 2FA setup complete! Welcome to BlockDrive.');
        return { success: true };
      } else {
        return {
          success: false,
          error: authResult.error || 'Failed to complete onboarding'
        };
      }

    } catch (error: any) {
      console.error('Onboarding completion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete onboarding'
      };
    }
  }

  /**
   * Handle NFT minting completion
   */
  static async handleNFTMinted(walletAddress: string): Promise<{
    success: boolean;
    proceedToSubdomain?: boolean;
    error?: string;
  }> {
    try {
      // Verify NFT was actually minted
      const nftVerification = await BaseAuthService.verifySoulboundNFT(walletAddress);
      
      if (!nftVerification.hasNFT) {
        return {
          success: false,
          error: 'NFT not found. Please ensure minting was successful.'
        };
      }

      // Check if subdomain is still needed
      const subdomainVerification = await BaseAuthService.verifyBaseSubdomain(walletAddress);
      
      if (!subdomainVerification.hasSubdomain) {
        toast.success('NFT verified! Now create your blockdrive.eth subdomain.');
        return {
          success: true,
          proceedToSubdomain: true
        };
      }

      // Both complete - finish onboarding
      return await this.completeOnboarding(walletAddress);

    } catch (error: any) {
      console.error('NFT minting completion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process NFT minting'
      };
    }
  }

  /**
   * Handle subdomain creation completion
   */
  static async handleSubdomainCreated(walletAddress: string, subdomain: string): Promise<{
    success: boolean;
    onboardingComplete?: boolean;
    error?: string;
  }> {
    try {
      // Verify subdomain was created
      const subdomainVerification = await BaseAuthService.verifyBaseSubdomain(walletAddress);
      
      if (!subdomainVerification.hasSubdomain) {
        return {
          success: false,
          error: 'Subdomain not found. Please try creating it again.'
        };
      }

      toast.success(`Base subdomain ${subdomain} created successfully!`);

      // Complete full onboarding
      const completionResult = await this.completeOnboarding(walletAddress);
      
      return {
        success: true,
        onboardingComplete: completionResult.success,
        error: completionResult.error
      };

    } catch (error: any) {
      console.error('Subdomain creation completion error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process subdomain creation'
      };
    }
  }
}
