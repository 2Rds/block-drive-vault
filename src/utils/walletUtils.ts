
export const convertSignatureToHex = (signature: Uint8Array): string => {
  return Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const createAuthMessage = (): string => {
  return 'Sign this message to verify your BlockDrive account.';
};

export const encodeMessage = (message: string): Uint8Array => {
  return new TextEncoder().encode(message);
};

export const detectWalletExtension = (walletType: 'phantom' | 'solflare'): boolean => {
  if (typeof window === 'undefined') return false;
  
  switch (walletType) {
    case 'phantom':
      return !!(window as any).phantom?.solana;
    case 'solflare':
      return !!(window as any).solflare;
    default:
      return false;
  }
};
