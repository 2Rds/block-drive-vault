
export interface StorageStrategy {
  type: 'ipfs' | 'solana-inscription';
  reason: string;
  estimated_cost: string;
  permanence: 'temporary' | 'permanent';
}

export interface HybridStorageResult {
  success: boolean;
  storageType: 'ipfs' | 'solana-inscription';
  fileId: string;
  storageId: string; // IPFS CID or Solana Inscription ID
  transactionSignature?: string;
  shardCount?: number;
}

/**
 * Analyzes files to determine optimal storage strategy
 */
export class StorageAnalyzer {
  /**
   * Analyzes a file and determines the optimal storage strategy
   */
  static analyzeFile(file: File): StorageStrategy {
    const fileSize = file.size;
    const fileType = file.type;
    
    // Critical document types that benefit from on-chain permanent storage
    const criticalTypes = [
      'application/pdf',
      'text/plain', 
      'application/json',
      'text/csv',
      'application/xml',
      'text/xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    // Large media types better suited for IPFS
    const mediaTypes = [
      'image/',
      'video/',
      'audio/',
      'application/zip',
      'application/x-rar-compressed'
    ];
    
    const isCriticalDocument = criticalTypes.includes(fileType);
    const isMediaFile = mediaTypes.some(type => fileType.startsWith(type));
    const isSmallFile = fileSize <= 10240; // 10KB
    const isMediumFile = fileSize <= 102400; // 100KB
    
    // Decision logic for storage type
    if (isCriticalDocument && isMediumFile) {
      return {
        type: 'solana-inscription',
        reason: 'Critical document requiring permanent on-chain storage',
        estimated_cost: '$0.01-0.05',
        permanence: 'permanent'
      };
    }
    
    if (isSmallFile && !isMediaFile) {
      return {
        type: 'solana-inscription',
        reason: 'Small file ideal for on-chain storage with maximum security',
        estimated_cost: '$0.01-0.03',
        permanence: 'permanent'
      };
    }
    
    if (isMediaFile || fileSize > 102400) {
      return {
        type: 'ipfs',
        reason: 'Large file or media content optimized for IPFS distributed storage',
        estimated_cost: '$0.001-0.01',
        permanence: 'temporary'
      };
    }
    
    // Default to IPFS for cost efficiency
    return {
      type: 'ipfs',
      reason: 'Cost-effective distributed storage with fast access',
      estimated_cost: '$0.001-0.01',
      permanence: 'temporary'
    };
  }
}
