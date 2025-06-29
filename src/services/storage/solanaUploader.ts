
import { SolanaInscriptionService } from '@/services/solanaInscriptionService';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { HybridStorageResult } from './storageAnalyzer';

/**
 * Handles uploading files to Solana Inscription
 */
export class SolanaUploader {
  /**
   * Uploads a file to Solana Inscription
   */
  static async uploadFile(
    file: File,
    user: any,
    folderPath?: string
  ): Promise<HybridStorageResult> {
    const inscriptionResult = await SolanaInscriptionService.createInscription(
      file,
      user.wallet_address || user.user_metadata?.wallet_address
    );
    
    // Save to database with inscription metadata
    const fileRecord = await FileDatabaseService.saveFile({
      filename: file.name,
      file_size: file.size,
      content_type: file.type,
      user_id: user.id,
      folder_path: folderPath || '/',
      storage_provider: 'solana-inscription',
      ipfs_cid: inscriptionResult.inscriptionId,
      ipfs_url: `solana://inscription/${inscriptionResult.inscriptionId}`,
      metadata: {
        storage_type: 'solana-inscription',
        inscription_id: inscriptionResult.inscriptionId,
        transaction_signature: inscriptionResult.transactionSignature,
        inscription_account: inscriptionResult.inscriptionAccount,
        shard_count: inscriptionResult.shards?.length || 1,
        permanence: 'permanent',
        blockchain: 'solana'
      }
    });
    
    return {
      success: true,
      storageType: 'solana-inscription',
      fileId: fileRecord.id,
      storageId: inscriptionResult.inscriptionId,
      transactionSignature: inscriptionResult.transactionSignature,
      shardCount: inscriptionResult.shards?.length
    };
  }
}
