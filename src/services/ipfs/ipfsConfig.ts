
export class IPFSConfig {
  static readonly PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJlMzQwMGM4My05ZWNhLTQ3YWMtYjkyOS1hNjkzMzY3YTM2ZDEiLCJlbWFpbCI6ImJsb2NrZHJpdmUuaW5jQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiJlZGFhMGZlNTI5ZGU1YzFhMjEzMCIsInNjb3BlZEtleVNlY3JldCI6IjYyNzc1YWZhNWM0ZjM4NGVhYTEwNzgyMGEzNGY0NDNkZmI4YmIzODFjNWE3YTAwNjVjOWI2NDQxY2E1M2QwYzIiLCJpYXQiOjE3NTA2NTAzNDJ9.k5c1Zn5t8L8B7NzEwNF9-Wk3-pzF6lhABJlMDpUbX-E';
  static readonly PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  static readonly PINATA_GATEWAY = 'https://gateway.pinata.cloud';
  
  static readonly FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs'
  ];

  static getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.PINATA_JWT}`,
    };
  }

  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }

  static getPinataIPFSUrl(cid: string): string {
    return `${this.PINATA_GATEWAY}/ipfs/${cid}`;
  }

  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
}
