
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
    console.log(`Uploading ${files.length} files to BlockDrive IPFS via Filebase...`);
    console.log(`Using DID: ${IPFSService.getDIDKey()}`);
    
    const uploadedFiles: IPFSFile[] = [];
    
    // Get or create wallet first
    const walletData = await WalletDatabaseService.getOrCreateWallet(user.id, user);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress?.(((i + 1) / files.length) * 50); // First 50% for IPFS upload
      
      console.log(`Processing file ${i + 1}/${files.length} for BlockDrive IPFS via Filebase: ${file.name}`);
      
      // Upload to BlockDrive IPFS via Filebase
      const ipfsResult = await IPFSService.uploadFile(file);
      if (!ipfsResult) {
        throw new Error(`Failed to upload ${file.name} to BlockDrive IPFS via Filebase`);
      }
      
      console.log('BlockDrive IPFS via Filebase upload result:', ipfsResult);
      
      // Pin the file to ensure availability in BlockDrive IPFS via Filebase
      await IPFSService.pinFile(ipfsResult.cid);
      
      // Store metadata in Supabase with BlockDrive IPFS via Filebase reference
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
    
    console.log('All files uploaded successfully to BlockDrive IPFS via Filebase:', uploadedFiles);
    toast.success(`Successfully uploaded ${files.length} file(s) to BlockDrive IPFS via Filebase!`);
    return uploadedFiles;
  }

  static async downloadFile(cid: string, filename: string) {
    console.log(`Downloading file from BlockDrive IPFS via Filebase: ${cid}`);
    
    const blob = await IPFSService.retrieveFile(cid);
    if (!blob) {
      throw new Error('Failed to retrieve file from BlockDrive IPFS via Filebase');
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
    
    toast.success(`Downloaded ${filename} from BlockDrive IPFS via Filebase!`);
  }

  static async deleteFile(fileId: string, cid: string, userId: string) {
    console.log(`Deleting file from BlockDrive IPFS via Filebase: ${fileId} (CID: ${cid})`);
    
    // Remove from database
    await FileDatabaseService.deleteFile(fileId, userId);
    
    // Unpin from BlockDrive IPFS via Filebase
    await IPFSService.unpinFile(cid);
    
    toast.success('File deleted from BlockDrive IPFS via Filebase successfully!');
  }
}
