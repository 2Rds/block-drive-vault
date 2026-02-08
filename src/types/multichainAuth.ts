export interface MultichainChallenge {
  version: string;
  label: string;
  domain: string;
  sol_pubkey: string;
  evm_addr: string;
  chains: string[];
  aud: string;
  nonce: string;
  issuedAt: string;
}

export interface MultichainVerificationRequest {
  label: string;
  sol_pubkey: string;
  evm_addr: string;
  sig_solana: string;
  sig_evm: string;
  challenge: MultichainChallenge;
}

export interface MultichainAuthResponse {
  authenticated: boolean;
  jwt?: string;
  factors?: string[];
  error?: string;
}

export interface TokengateCheckResponse {
  valid: boolean;
  subject?: {
    label: string;
    sol_pubkey: string;
    evm_addr: string;
  };
  error?: string;
}

export interface ConnectedWallets {
  solana?: {
    address: string;
    chain: string;
    connector: any;
  };
  evm?: {
    address: string;
    chain: string;
    chainId: number;
    connector: any;
  };
}