// Stub - Legacy Supabase auth service deprecated with Clerk auth
export class SupabaseAuthService {
  static checkWalletSession() {
    console.warn('SupabaseAuthService is deprecated. Use Clerk authentication.');
    return null;
  }

  static async getInitialSession() {
    return null;
  }

  static setupAuthStateListener(_callback: (event: string, session: any) => void) {
    console.warn('SupabaseAuthService.setupAuthStateListener is deprecated. Use Clerk authentication.');
    return { data: { subscription: { unsubscribe: () => {} } } };
  }

  static async loadWalletData(_userId: string) {
    return null;
  }

  static async connectWallet(_walletAddress: string, _signature: string, _blockchainType: string, _message: string) {
    console.warn('SupabaseAuthService.connectWallet is deprecated. Use Clerk authentication.');
    return { error: { message: 'Use Clerk authentication' } };
  }

  static async signOut() {
    console.warn('SupabaseAuthService.signOut is deprecated. Use Clerk signOut.');
    return { error: null };
  }
}
