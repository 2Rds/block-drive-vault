/**
 * Arweave Storage Provider
 * 
 * Implements permanent storage via the Arweave network.
 * Used for guaranteed permanent storage of critical data.
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

export class ArweaveProvider extends StorageProviderBase {
  readonly type: StorageProviderType = 'arweave';
  readonly name = 'Arweave Permanent Storage';
  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: true,  // True permanent, immutable storage
    supportsLargeFiles: false,       // Limited to ~10MB per transaction
    maxFileSizeMB: 10,
    averageLatencyMs: 3000,
    costPerGBCents: 200 // One-time payment for permanent storage
  };

  private gateway = 'https://arweave.net';

  async checkHealth(): Promise<ProviderHealthCheck> {
    const start = performance.now();
    
    try {
      // Check Arweave gateway
      const response = await fetch(`${this.gateway}/info`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      const latencyMs = Math.round(performance.now() - start);
      
      if (response.ok) {
        const info = await response.json();
        return {
          provider: this.type,
          status: info.network ? 'available' : 'degraded',
          latencyMs,
          lastChecked: Date.now()
        };
      }
      
      return {
        provider: this.type,
        status: 'degraded',
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
      // Check file size limit
      if (data.length > this.capabilities.maxFileSizeMB * 1024 * 1024) {
        throw new Error(`File too large for Arweave. Max size: ${this.capabilities.maxFileSizeMB}MB`);
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('Not authenticated');
      }

      // Upload via edge function (handles Arweave wallet and bundling)
      const { data: result, error } = await supabase.functions.invoke('storage-arweave', {
        body: {
          data: Array.from(data), // Convert to array for JSON serialization
          fileName,
          contentType,
          metadata
        }
      });

      if (error) {
        throw new Error(error.message || 'Arweave upload failed');
      }

      const uploadTimeMs = Math.round(performance.now() - start);

      return {
        success: true,
        provider: this.type,
        identifier: result.txId,
        url: `${this.gateway}/${result.txId}`,
        metadata: {
          transactionId: result.txId,
          bundleId: result.bundleId
        },
        uploadTimeMs
      };
    } catch (error) {
      const uploadTimeMs = Math.round(performance.now() - start);
      return this.createErrorResult(
        error instanceof Error ? error.message : 'Arweave upload failed',
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
    if (identifier.startsWith('http')) {
      return identifier;
    }
    return `${this.gateway}/${identifier}`;
  }
}
