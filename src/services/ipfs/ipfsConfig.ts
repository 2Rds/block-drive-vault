export class IPFSConfig {
  // Filebase IPFS gateway - can be configured to use dedicated gateway
  static readonly FILEBASE_GATEWAY = 'https://ipfs.filebase.io';
  
  static readonly FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs',
    'https://gateway.pinata.cloud/ipfs'
  ];

  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }

  static getFilebaseIPFSUrl(cid: string): string {
    return `${this.FILEBASE_GATEWAY}/ipfs/${cid}`;
  }

  // Keep legacy method for backwards compatibility
  static getPinataIPFSUrl(cid: string): string {
    return this.getFilebaseIPFSUrl(cid);
  }

  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
}
