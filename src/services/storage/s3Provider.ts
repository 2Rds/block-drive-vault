/**
 * S3 Storage Provider
 * 
 * Implements storage via Amazon S3 or S3-compatible services.
 * Used as a reliable backup provider with high availability.
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

export class S3Provider extends StorageProviderBase {
  readonly type: StorageProviderType = 's3';
  readonly name = 'Amazon S3';
  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: false, // S3 is durable but not permanent/immutable
    supportsLargeFiles: true,
    maxFileSizeMB: 5000, // 5TB with multipart
    averageLatencyMs: 200,
    costPerGBCents: 2.3 // ~$0.023/GB/month
  };

  async checkHealth(): Promise<ProviderHealthCheck> {
    const start = performance.now();
    
    try {
      // Call health check via edge function
      const { data, error } = await supabase.functions.invoke('storage-health', {
        body: { provider: 's3' }
      });
      
      const latencyMs = Math.round(performance.now() - start);
      
      if (error) {
        return {
          provider: this.type,
          status: 'unavailable',
          latencyMs,
          lastChecked: Date.now(),
          errorMessage: error.message
        };
      }
      
      return {
        provider: this.type,
        status: data?.healthy ? 'available' : 'degraded',
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
      formData.append('provider', 's3');
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Call storage edge function with S3 provider
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-upload`,
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
        throw new Error(errorData.error || 'S3 upload failed');
      }

      const result = await response.json();
      const uploadTimeMs = Math.round(performance.now() - start);

      return {
        success: true,
        provider: this.type,
        identifier: result.key,
        url: result.url,
        metadata: result.metadata,
        uploadTimeMs
      };
    } catch (error) {
      const uploadTimeMs = Math.round(performance.now() - start);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'S3 upload failed',
        uploadTimeMs
      );
    }
  }

  async download(identifier: string): Promise<ProviderDownloadResult> {
    const start = performance.now();
    
    try {
      // Generate presigned URL via edge function
      const { data, error } = await supabase.functions.invoke('storage-download', {
        body: { 
          provider: 's3',
          identifier 
        }
      });

      if (error || !data?.url) {
        throw new Error(error?.message || 'Failed to get download URL');
      }

      const response = await fetch(data.url);
      
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
    // S3 URLs are generated via presigned URLs, return placeholder
    return `s3://${identifier}`;
  }
}
