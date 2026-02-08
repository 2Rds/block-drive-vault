
export interface TokenRequest {
  email: string;
  fullName: string;
  organization?: string;
  walletAddress: string;
  blockchainType: string;
}

export interface TokenResponse {
  success: boolean;
  message?: string;
  error?: string;
  emailId?: string;
  tokenId?: string;
}
