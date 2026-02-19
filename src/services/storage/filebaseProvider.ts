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

// Worker gateway provides cached IPFS access with auth, rate limiting, and edge caching
const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';
const FILEBASE_GATEWAY = 'https://ipfs.filebase.io';

// Route IPFS downloads through the Worker gateway when available
const USE_WORKER_GATEWAY = Boolean(WORKER_URL);

export class FilebaseProvider extends StorageProviderBase {
  readonly type: StorageProviderType = 'filebase';
  readonly name = 'Filebase IPFS';
  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: true,
    supportsLargeFiles: true,
    maxFileSizeMB: 5000, // 5GB
    averageLatencyMs: USE_WORKER_GATEWAY ? 300 : 1500, // Worker gateway is edge-cached
    costPerGBCents: 0.6 // ~$0.006/GB/month
  };

  // Primary gateway for uploads (ensures pinning)
  private uploadGateway = FILEBASE_GATEWAY;
  // Download gateway — Worker for auth + edge caching, fallback to Filebase direct
  private downloadGateway = USE_WORKER_GATEWAY ? WORKER_URL : FILEBASE_GATEWAY;

  async checkHealth(): Promise<ProviderHealthCheck> {
    const start = performance.now();

    try {
      // Check download gateway availability (Cloudflare or Filebase)
      const response = await fetch(`${this.downloadGateway}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG`, {
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

      // Skip DB insert — the upload hook creates the proper file record
      formData.append('skipDbInsert', 'true');

      const authToken = await this.getAuthToken();

      if (!authToken) {
        throw new Error('Not authenticated — no auth token available');
      }

      const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-ipfs`;

      // Call edge function
      const response = await fetch(edgeFnUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

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
      console.error('[FilebaseProvider] upload FAILED:', error);
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
    // Worker gateway uses /ipfs/{cid}, Filebase uses /ipfs/{cid} too
    return `${this.downloadGateway}/ipfs/${identifier}`;
  }

  /**
   * Get direct Filebase URL (bypasses Cloudflare, for pinning verification)
   */
  getFilebaseUrl(identifier: string): string {
    return `${FILEBASE_GATEWAY}/ipfs/${identifier}`;
  }

  /**
   * Get auth token from Dynamic session, fallback to Supabase
   */
  private async getAuthToken(): Promise<string> {
    if (typeof window !== 'undefined' && window.__dynamic_session?.getToken) {
      const token = await window.__dynamic_session.getToken();
      return token || '';
    }
    // Fallback to Supabase session token
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || '';
    } catch {
      return '';
    }
  }
}
