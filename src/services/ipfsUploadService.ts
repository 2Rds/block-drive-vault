
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FileDatabaseService } from './fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';

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
      console.log(`Processing file ${i + 1}/${totalFiles} for BlockDrive IPFS via Filebase: ${file.name}`);
      
      try {
        // Upload to IPFS via edge function
        const formData = new FormData();
        formData.append('file', file);
        
        const { data: uploadResult, error } = await supabase.functions.invoke('upload-to-ipfs', {
          body: formData,
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(`Upload failed: ${error.message}`);
        }

        if (!uploadResult) {
          throw new Error('No upload result returned');
        }

        // Save to database
        const ipfsFile: Omit<IPFSFile, 'id' | 'uploadedAt'> = {
          filename: uploadResult.filename,
          cid: uploadResult.cid,
          size: uploadResult.size,
          contentType: uploadResult.contentType,
          ipfsUrl: uploadResult.url,
          userId: user.id,
          folderPath: folderPath,
          metadata: {
            storage_type: 'ipfs' as const,
            permanence: 'permanent' as const,
            blockchain: 'ipfs'
          }
        };

        const savedFile = await FileDatabaseService.saveFile(ipfsFile);
        if (savedFile) {
          uploadedFiles.push(savedFile);
          console.log(`File ${i + 1}/${totalFiles} uploaded successfully:`, savedFile);
        }

        // Update progress
        const progress = ((i + 1) / totalFiles) * 100;
        onProgress?.(progress);

      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        throw new Error(`Failed to upload ${file.name} to BlockDrive IPFS via Filebase`);
      }
    }

    return uploadedFiles;
  }

  static async downloadFile(cid: string, filename: string): Promise<void> {
    try {
      const url = `https://regular-amber-sloth.myfilebase.com/ipfs/${cid}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
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
