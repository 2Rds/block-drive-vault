
export interface ConnectedWallet {
  address: string;
  blockchain: string;
}

export interface WalletAdapter {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
  publicKey: any;
}

export interface WalletConnectionResult {
  success: boolean;
  error?: string;
}
