// Stub - Legacy wallet service deprecated with Clerk auth
export const createSecureWalletForUser = async (_userId: string, _blockchainType: 'solana', _userPassword: string) => {
  console.warn('createSecureWalletForUser is deprecated. Use Clerk authentication.');
  return null;
};

export const getUserWallet = async (_userId: string) => {
  console.warn('getUserWallet is deprecated. Use Clerk authentication.');
  return null;
};

export const validateWalletAccess = async (_userId: string): Promise<boolean> => {
  console.warn('validateWalletAccess is deprecated. Use Clerk authentication.');
  return false;
};
