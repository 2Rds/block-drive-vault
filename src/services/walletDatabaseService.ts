// Stub - Legacy wallet database service deprecated with Clerk auth
export class WalletDatabaseService {
  static async getOrCreateWallet(_userId: string, _userMetadata: any) {
    console.warn('WalletDatabaseService is deprecated. Use Clerk authentication.');
    return { id: _userId };
  }
}
