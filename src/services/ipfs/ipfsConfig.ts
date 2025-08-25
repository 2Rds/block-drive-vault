export class IPFSConfig {
  static readonly PINATA_GATEWAY = 'https://gray-acceptable-grouse-462.mypinata.cloud';
  
  static readonly FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs'
  ];

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