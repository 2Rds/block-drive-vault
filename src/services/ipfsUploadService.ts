
import { IPFSService } from '@/services/ipfsService';
import { WalletDatabaseService } from '@/services/walletDatabaseService';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';

export class IPFSUploadService {
  static async uploadFiles(
    files: FileList,
    user: any,
    folderPath?: string,
    onProgress?: (progress: number) => void
  ): Promise<IPFSFile[]> {
    console.log(`Uploading ${files.length} files to IPFS...`);
    
    const uploadedFiles: IPFSFile[] = [];
    
    // Get or create wallet first
    const walletData = await WalletDatabaseService.getOrCreateWallet(user.id, user);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(((i + 1) / files.length) * 50); // First 50% for IPFS upload
      
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      // Upload to IPFS
      const ipfsResult = await IPFSService.uploadFile(file);
      if (!ipfsResult) {
        throw new Error(`Failed to upload ${file.name} to IPFS`);
      }
      
      console.log('IPFS upload result:', ipfsResult);
      
      // Pin the file to ensure availability
      await IPFSService.pinFile(ipfsResult.cid);
      
      // Store metadata in Supabase
      const dbFile = await FileDatabaseService.saveFileMetadata(
        user.id,
        walletData.id,
        ipfsResult,
        file,
        folderPath
      );
      
      const ipfsFile: IPFSFile = {
        id: dbFile.id,
        filename: dbFile.filename,
        cid: dbFile.ipfs_cid || ipfsResult.cid,
        size: dbFile.file_size || ipfsResult.size,
        contentType: dbFile.content_type || ipfsResult.contentType,
        ipfsUrl: dbFile.ipfs_url || ipfsResult.url,
        uploadedAt: dbFile.created_at,
        userId: user.id,
        folderPath: dbFile.folder_path || folderPath
      };
      
      uploadedFiles.push(ipfsFile);
      
      onProgress?.(50 + ((i + 1) / files.length) * 50); // Second 50% for database save
    }
    
    console.log('All files uploaded successfully:', uploadedFiles);
    return uploadedFiles;
  }

  static async downloadFile(cid: string, filename: string) {
    console.log(`Downloading file from IPFS: ${cid}`);
    
    const blob = await IPFSService.retrieveFile(cid);
    if (!blob) {
      throw new Error('Failed to retrieve file from IPFS');
    }
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded ${filename} successfully!`);
  }

  static async deleteFile(fileId: string, cid: string, userId: string) {
    console.log(`Deleting file: ${fileId} (CID: ${cid})`);
    
    // Remove from database
    await FileDatabaseService.deleteFile(fileId, userId);
    
    // Unpin from IPFS (in production, this would remove it from your pinning service)
    await IPFSService.unpinFile(cid);
    
    toast.success('File deleted successfully!');
  }
}
