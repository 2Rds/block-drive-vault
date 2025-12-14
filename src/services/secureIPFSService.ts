import { supabase } from "@/integrations/supabase/client";

export interface IPFSUploadResult {
  success: boolean;
  file?: {
    id: string;
    filename: string;
    cid: string;
    size: number;
    contentType: string;
    ipfsUrl: string;
    uploadedAt: string;
    userId: string;
    folderPath: string;
    metadata: any;
  };
  error?: string;
}

export class SecureIPFSService {
  async uploadFile(file: File, folderPath: string = "/"): Promise<IPFSUploadResult> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folderPath', folderPath);

      // Upload via secure Edge Function that uses server-side Filebase credentials
      const { data, error } = await supabase.functions.invoke('upload-to-ipfs', {
        body: formData
      });

      if (error) {
        console.error('IPFS upload error:', error);
        return {
          success: false,
          error: error.message || 'Upload failed'
        };
      }

      return data as IPFSUploadResult;
    } catch (error) {
      console.error('IPFS upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  // Pinning operations should also go through Edge Functions for security
  async pinFile(cid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ipfs-pin', {
        body: { cid, action: 'pin' }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Pin operation failed'
      };
    }
  }

  async unpinFile(cid: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('ipfs-pin', {
        body: { cid, action: 'unpin' }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unpin operation failed'
      };
    }
  }

  // Gateway URLs remain safe to generate client-side
  static getIPFSGatewayUrl(cid: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${cid}`;
  }

  static getFilebaseIPFSUrl(cid: string): string {
    return `https://ipfs.filebase.io/ipfs/${cid}`;
  }

  // Legacy method for backwards compatibility
  static getPinataIPFSUrl(cid: string): string {
    return SecureIPFSService.getFilebaseIPFSUrl(cid);
  }

  static isValidCID(cid: string): boolean {
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{55,}|bafk[a-z0-9]{55,})$/.test(cid);
  }
}

export const secureIPFSService = new SecureIPFSService();
