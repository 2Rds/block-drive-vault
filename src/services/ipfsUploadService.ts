import { toast } from 'sonner';
import { FileDatabaseService } from './fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { IPFSService } from './ipfsService';

interface User {
  id: string;
  wallet_address?: string;
}

export class IPFSUploadService {
  static async uploadFiles(
    files: FileList,
    user: User,
    folderPath: string = '/',
    onProgress?: (progress: number) => void
  ): Promise<IPFSFile[]> {
    const uploadedFiles: IPFSFile[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${totalFiles} for IPFS via Filebase: ${file.name}`);
      
      try {
        const uploadResult = await IPFSService.uploadFile(file);

        if (!uploadResult) {
          throw new Error('No upload result returned');
        }

        const fileData = {
          filename: uploadResult.filename,
          file_size: uploadResult.size,
          content_type: uploadResult.contentType,
          clerk_user_id: user.id,
          folder_path: folderPath,
          storage_provider: 'ipfs',
          ipfs_cid: uploadResult.cid,
          ipfs_url: uploadResult.url,
          metadata: {
            storage_type: 'ipfs' as const,
            permanence: 'permanent' as const,
            blockchain: 'ipfs',
            provider: 'filebase'
          }
        };

        const savedFile = await FileDatabaseService.saveFile(fileData);
        if (savedFile) {
          const ipfsFile: IPFSFile = {
            id: savedFile.id,
            filename: savedFile.filename,
            cid: savedFile.ipfs_cid || '',
            size: savedFile.file_size || 0,
            contentType: savedFile.content_type || 'application/octet-stream',
            ipfsUrl: savedFile.ipfs_url || '',
            uploadedAt: savedFile.created_at,
            userId: savedFile.clerk_user_id,
            folderPath: savedFile.folder_path,
            metadata: savedFile.metadata as IPFSFile['metadata']
          };
          
          uploadedFiles.push(ipfsFile);
          console.log(`File ${i + 1}/${totalFiles} uploaded successfully:`, ipfsFile);
        }

        const progress = ((i + 1) / totalFiles) * 100;
        onProgress?.(progress);

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name} to IPFS via Filebase`);
      }
    }

    return uploadedFiles;
  }

  static async downloadFile(cid: string, filename: string): Promise<void> {
    try {
      const gateways = [
        `https://ipfs.filebase.io/ipfs/${cid}`,
        `https://ipfs.io/ipfs/${cid}`,
        `https://cloudflare-ipfs.com/ipfs/${cid}`,
        `https://dweb.link/ipfs/${cid}`
      ];
      
      let blob: Blob | null = null;
      
      for (const url of gateways) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            blob = await response.blob();
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!blob) {
        throw new Error('Failed to download file from all gateways');
      }
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast.success(`Downloaded ${filename} successfully!`);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download ${filename}`);
    }
  }

  static async deleteFile(fileId: string, cid: string, userId: string): Promise<void> {
    try {
      await FileDatabaseService.deleteFile(fileId, userId);
      console.log(`File deleted: ${fileId} (CID: ${cid})`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }
}
