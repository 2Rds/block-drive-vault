


export class IPFSConfig {
  static readonly PINATA_API_KEY = 'f684a12c1928d962d5bd';
  static readonly PINATA_SECRET_API_KEY = 'a4390de4be6c88fc8b587f9057b0a878678714b09152c4a08e0b9eef7d5d1e41';
  static readonly PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
  static readonly PINATA_GATEWAY = 'https://gray-acceptable-grouse-462.mypinata.cloud';
  
  static readonly FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs'
  ];

  static getAuthHeaders() {
    return {
      'pinata_api_key': this.PINATA_API_KEY,
      'pinata_secret_api_key': this.PINATA_SECRET_API_KEY,
      'Content-Type': 'application/json'
    };
  }

  static getUploadHeaders() {
    return {
      'pinata_api_key': this.PINATA_API_KEY,
      'pinata_secret_api_key': this.PINATA_SECRET_API_KEY
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


