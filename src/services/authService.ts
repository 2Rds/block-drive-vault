// Stub - Legacy auth service deprecated with Clerk
export class AuthService {
  static async loadWalletData(_userId: string) {
    console.warn('AuthService.loadWalletData is deprecated. Use Clerk authentication.');
    return null;
  }

  static async validateSession() {
    return true;
  }

  static async connectWallet(_walletAddress: string, _signature: string, _blockchainType: string) {
    console.warn('AuthService.connectWallet is deprecated. Use Clerk authentication.');
    return { error: { message: 'Use Clerk authentication' } };
  }

  static async signOut() {
    console.warn('AuthService.signOut is deprecated. Use Clerk authentication.');
    return { error: null };
  }
}
