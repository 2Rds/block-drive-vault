
export interface IPFSFile {
  id: string;
  filename: string;
  cid: string;
  size: number;
  contentType: string;
  ipfsUrl: string;
  uploadedAt: string;
  userId: string;
  folderPath?: string;
  metadata?: {
    storage_type?: 'ipfs' | 'solana-inscription';
    inscription_id?: string;
    transaction_signature?: string;
    inscription_account?: string;
    shard_count?: number;
    permanence?: 'temporary' | 'permanent';
    blockchain?: string;
    [key: string]: any;
  };
}

export interface IPFSUploadProgress {
  uploading: boolean;
  progress: number;
}
