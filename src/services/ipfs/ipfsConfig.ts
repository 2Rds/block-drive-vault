
export class IPFSConfig {
  static readonly BLOCKDRIVE_DID = 'did:key:z6MkhyUYfeQAP2BHxwzbK93LxpiVSrKYZfrKw6EWhLHeefoe';
  static readonly FILEBASE_RPC_KEY = 'MjUzMDc4QjZBMzZDQjc5RDNBMTU6YmlBdTZKa0ZMV01sYUxSSEpDMWFsSzdNbENJbWVMU1IzRUtRVHZvUDpibG9ja2RyaXZlLXN0b3JhZ2U=';
  static readonly FILEBASE_GATEWAY = 'https://regular-amber-sloth.myfilebase.com';
  static readonly FILEBASE_BUCKET = 'blockdrive-storage';
  static readonly FILEBASE_API_BASE_URL = 'https://api.filebase.com/v1/ipfs';
  
  static readonly FALLBACK_GATEWAYS = [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs'
  ];

  static getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.FILEBASE_RPC_KEY}`,
    };
  }

  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }

  static getBlockDriveIPFSUrl(cid: string): string {
    return `${this.FILEBASE_GATEWAY}/ipfs/${cid}`;
  }

  static isValidCID(cid: string): boolean {
    // Basic CID validation for both v0 and v1
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }

  static getDIDKey(): string {
    return this.BLOCKDRIVE_DID;
  }
}
