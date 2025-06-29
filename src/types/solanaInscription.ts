
export interface InscriptionData {
  id: string;
  data: Uint8Array;
  contentType: string;
  metadata: {
    filename: string;
    size: number;
    timestamp: number;
    shardIndex?: number;
    totalShards?: number;
    originalHash?: string;
  };
}

export interface InscriptionResult {
  inscriptionId: string;
  transactionSignature: string;
  inscriptionAccount: string;
  shards?: InscriptionResult[];
}

export interface InscriptionMetadata {
  filename: string;
  size: number;
  contentType: string;
  timestamp: number;
  dataHash?: string;
}
