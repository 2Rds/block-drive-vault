// Stub - Legacy wallet security service deprecated with Clerk auth
export class WalletSecurityService {
  static async validateUserOwnership(_userId: string): Promise<boolean> {
    console.warn('WalletSecurityService is deprecated. Use Clerk authentication.');
    return false;
  }

  static validateWalletCreationData(_walletData: any): { isValid: boolean; errors: string[] } {
    return { isValid: false, errors: ['Deprecated - use Clerk authentication'] };
  }

  static async createWalletSecurely(_userId: string, _walletData: any): Promise<{ success: boolean; wallet?: any; error?: string }> {
    console.warn('WalletSecurityService.createWalletSecurely is deprecated. Use Clerk authentication.');
    return { success: false, error: 'Use Clerk authentication' };
  }

  static async getUserWalletCount(_userId: string): Promise<number> {
    return 0;
  }

  static async validateWalletSession(_userId: string): Promise<boolean> {
    return false;
  }

  static isWalletOperationRateLimited(_userId: string, _operation: string): boolean {
    return false;
  }

  static async monitorWalletAccess(_userId: string, _operation: string): Promise<void> {}

  static async getWalletSecurely(_userId: string): Promise<any> {
    console.warn('WalletSecurityService.getWalletSecurely is deprecated. Use Clerk authentication.');
    return null;
  }
}
