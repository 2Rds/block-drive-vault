
import { toast } from 'sonner';
import { IPFSConfig } from './ipfsConfig';
import { supabase } from '@/integrations/supabase/client';

interface IPFSUploadResult {
  cid: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

export class IPFSUploadService {
  static async uploadFile(file: File): Promise<IPFSUploadResult | null> {
    try {
      console.log(`Starting BlockDrive IPFS upload via Filebase for file: ${file.name} (${file.size} bytes)`);
      console.log(`Using DID: ${IPFSConfig.getDIDKey()}`);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const { data, error } = await supabase.functions.invoke('upload-to-ipfs', {
        body: formData,
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No data returned from upload function');
      }
      
      const uploadResult: IPFSUploadResult = {
        cid: data.cid,
        url: data.url,
        filename: data.filename,
        size: data.size,
        contentType: data.contentType
      };
      
      console.log('BlockDrive IPFS upload successful via Filebase:', uploadResult);
      toast.success(`File uploaded to BlockDrive IPFS via Filebase: ${data.cid}`);
      return uploadResult;
      
    } catch (error) {
      console.error('BlockDrive IPFS upload via Filebase failed:', error);
      toast.error(`Failed to upload file to BlockDrive IPFS via Filebase: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }
  
  static async uploadMultipleFiles(files: FileList): Promise<IPFSUploadResult[]> {
    const results: IPFSUploadResult[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Uploading file ${i + 1}/${files.length} to BlockDrive IPFS via Filebase...`);
      const result = await this.uploadFile(file);
      if (result) {
        results.push(result);
      }
    }
    
    console.log(`Successfully uploaded ${results.length}/${files.length} files to BlockDrive IPFS via Filebase`);
    return results;
  }
}

export type { IPFSUploadResult };
