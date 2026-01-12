// Stub - Legacy signup service deprecated with Clerk auth
export interface SignupData {
  email: string;
  fullName: string;
  organization?: string;
  subscriptionTier?: string;
}

export class SignupService {
  static async registerUser(_signupData: SignupData) {
    console.warn('SignupService is deprecated. Use Clerk authentication.');
    return { error: { message: 'Use Clerk authentication' } };
  }

  static async checkEmailExists(_email: string) {
    return false;
  }

  static async linkWalletToSignup(_email: string, _walletAddress: string) {
    return { error: null };
  }

  static async updateWalletConnection(_email: string, _walletAddress: string, _blockchainType: string) {
    console.warn('SignupService.updateWalletConnection is deprecated. Use Clerk authentication.');
    return { data: null, error: null };
  }

  static async getSignupByEmail(_email: string) {
    console.warn('SignupService.getSignupByEmail is deprecated. Use Clerk authentication.');
    return { data: null, error: null };
  }

  static async linkSignupToUser() {
    console.warn('SignupService.linkSignupToUser is deprecated. Use Clerk authentication.');
    return { error: null };
  }
}
