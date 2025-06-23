
export interface WalletData {
  address: string;
  privateKey: string;
  publicKey: string;
  blockchain: 'solana' | 'ethereum' | 'ton';
}

// Simple wallet generation for demo purposes
// In production, use proper blockchain libraries
export const generateWallet = (blockchainType: 'solana' | 'ethereum' | 'ton'): WalletData => {
  const generateRandomHex = (length: number) => {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateRandomBase58 = (length: number) => {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  switch (blockchainType) {
    case 'solana':
      return {
        address: generateRandomBase58(44),
        privateKey: generateRandomHex(64),
        publicKey: generateRandomHex(64),
        blockchain: 'solana'
      };
    case 'ethereum':
      return {
        address: '0x' + generateRandomHex(40),
        privateKey: generateRandomHex(64),
        publicKey: generateRandomHex(128),
        blockchain: 'ethereum'
      };
    case 'ton':
      return {
        address: 'EQ' + generateRandomBase58(46),
        privateKey: generateRandomHex(64),
        publicKey: generateRandomHex(64),
        blockchain: 'ton'
      };
    default:
      throw new Error('Unsupported blockchain type');
  }
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
