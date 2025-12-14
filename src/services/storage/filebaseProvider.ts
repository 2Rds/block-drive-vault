/**
 * Filebase Storage Provider
 * 
 * Implements IPFS storage via Filebase's S3-compatible API.
 * Primary provider for BlockDrive decentralized storage.
 */

import { 
  StorageProviderType,
  ProviderCapabilities,
  ProviderHealthCheck,
  ProviderUploadResult,
  ProviderDownloadResult 
} from '@/types/storageProvider';
import { StorageProviderBase } from './storageProviderBase';
import { supabase } from '@/integrations/supabase/client';

export class FilebaseProvider extends StorageProviderBase {
  readonly type: StorageProviderType = 'filebase';
  readonly name = 'Filebase IPFS';
  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: true,
    supportsLargeFiles: true,
    maxFileSizeMB: 5000, // 5GB
    averageLatencyMs: 1500,
    costPerGBCents: 0.6 // ~$0.006/GB/month
  };

  private gateway = 'https://ipfs.filebase.io';

  async checkHealth(): Promise<ProviderHealthCheck> {
    const start = performance.now();
    
    try {
      // Check gateway availability
      const response = await fetch(`${this.gateway}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      const latencyMs = Math.round(performance.now() - start);
      
      return {
        provider: this.type,
        status: response.ok ? 'available' : 'degraded',
        latencyMs,
        lastChecked: Date.now()
      };
    } catch (error) {
      return {
        provider: this.type,
        status: 'unavailable',
        latencyMs: Math.round(performance.now() - start),
        lastChecked: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  async upload(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult> {
    const start = performance.now();
    
    try {
      // Create form data for edge function
      const formData = new FormData();
      const blob = new Blob([data.buffer as ArrayBuffer], { type: contentType });
      formData.append('file', blob, fileName);
      
      if (metadata?.folderPath) {
        formData.append('folderPath', metadata.folderPath);
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Call edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-ipfs`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      const uploadTimeMs = Math.round(performance.now() - start);

      return {
        success: true,
        provider: this.type,
        identifier: result.file.cid,
        url: result.file.ipfsUrl,
        metadata: {
          fileId: result.file.id,
          fileName: result.file.filename
        },
        uploadTimeMs
      };
    } catch (error) {
      const uploadTimeMs = Math.round(performance.now() - start);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Upload failed',
        uploadTimeMs
      );
    }
  }

  async download(identifier: string): Promise<ProviderDownloadResult> {
    const start = performance.now();
    
    try {
      const url = this.getAccessUrl(identifier);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const downloadTimeMs = Math.round(performance.now() - start);

      return {
        success: true,
        provider: this.type,
        data: new Uint8Array(arrayBuffer),
        downloadTimeMs
      };
    } catch (error) {
      return {
        success: false,
        provider: this.type,
        data: new Uint8Array(0),
        downloadTimeMs: Math.round(performance.now() - start),
        error: error instanceof Error ? error.message : 'Download failed'
      };
    }
  }

  getAccessUrl(identifier: string): string {
    // Handle both CID and full URL
    if (identifier.startsWith('http')) {
      return identifier;
    }
    return `${this.gateway}/ipfs/${identifier}`;
  }
}
