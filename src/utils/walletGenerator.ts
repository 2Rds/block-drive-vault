
export interface WalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  blockchain: 'solana';
}

// Simple wallet generation for demo purposes
// In production, use proper blockchain libraries
export const generateWallet = (blockchainType: 'solana'): WalletData => {
  const generateRandomBase58 = (length: number) => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return {
    address: generateRandomBase58(44),
    privateKey: generateRandomBase58(64),
    publicKey: generateRandomBase58(64),
    blockchain: 'solana'
  };
};

export const encryptPrivateKey = (privateKey: string, password: string): string => {
  // Simple encryption for demo - use proper encryption in production
  const encoded = btoa(privateKey + '|' + password);
  return encoded;
};

export const generateUniqueTokenId = (walletAddress: string, blockchainType: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${blockchainType.toUpperCase()}_${walletAddress.substring(0, 8)}_${timestamp}_${random}`;
};
