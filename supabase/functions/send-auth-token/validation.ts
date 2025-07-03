
import { TokenRequest } from './types.ts';

export const validateRequest = (data: TokenRequest): string | null => {
  if (!data.walletAddress || !data.blockchainType) {
    return 'Wallet address and blockchain type are required';
  }
  return null;
};
