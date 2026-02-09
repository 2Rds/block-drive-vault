/**
 * Cloudflare R2 Storage Provider
 *
 * Routes all R2 operations through the BlockDrive API Gateway Worker.
 * No client-side S3 credentials — the Worker uses its R2 binding directly.
 */

import { StorageProviderBase } from './storageProviderBase';
import {
  StorageProviderType,
  ProviderCapabilities,
  ProviderHealthCheck,
  ProviderUploadResult,
  ProviderDownloadResult,
} from '@/types/storageProvider';

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

/**
 * Check if R2 provider is configured (Worker URL must be set)
 */
export function isR2Configured(): boolean {
  return Boolean(WORKER_URL);
}

// Org context for hierarchical key generation (resolved server-side)
export interface R2UploadContext {
  userId: string;
  orgSlug?: string;
  isShared?: boolean;
  folderPath?: string;
}

/**
 * Cloudflare R2 Storage Provider — Worker-proxied
 */
export class R2Provider extends StorageProviderBase {
  readonly type: StorageProviderType = 'r2';
  readonly name = 'Cloudflare R2';

  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: false,
    supportsLargeFiles: true,
    maxFileSizeMB: 5120,
    averageLatencyMs: 50,
    costPerGBCents: 1.5,
  };

  async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = performance.now();

    try {
      const response = await fetch(`${WORKER_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        provider: this.type,
        status: response.ok ? 'available' : 'degraded',
        latencyMs,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        provider: this.type,
        status: 'unavailable',
        latencyMs: Math.round(performance.now() - startTime),
        lastChecked: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  /**
   * Upload file to R2 via Worker gateway
   */
  async upload(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult> {
    const { result, timeMs } = await this.measureTime(async () => {
      try {
        // Extract org context from metadata if present
        const userId = metadata?.userId || 'anonymous';
        const orgSlug = metadata?.orgSlug;
        const isShared = metadata?.isShared === 'true';
        const folderPath = metadata?.folderPath;

        // Get auth token from Clerk session
        const authToken = await this.getAuthToken();

        const response = await fetch(`${WORKER_URL}/r2/put`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/octet-stream',
            'X-Blockdrive-UserId': userId,
            'X-Blockdrive-FileName': fileName,
            ...(orgSlug && { 'X-Blockdrive-OrgSlug': orgSlug }),
            ...(isShared && { 'X-Blockdrive-IsShared': 'true' }),
            ...(folderPath && { 'X-Blockdrive-FolderPath': folderPath }),
          },
          body: data,
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          return { success: false, key: '', error: errorData.error || `Upload failed: ${response.status}` };
        }

        const result = await response.json() as { success: boolean; key: string };
        return { success: true, key: result.key };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[R2Provider] Upload failed:', errorMessage);
        return { success: false, key: '', error: errorMessage };
      }
    });

    if (!result.success) {
      return this.createErrorResult(result.error || 'Upload failed', timeMs);
    }

    return {
      success: true,
      provider: this.type,
      identifier: result.key,
      url: this.getAccessUrl(result.key),
      metadata: {
        key: result.key,
        ...metadata,
      },
      uploadTimeMs: timeMs,
    };
  }

  /**
   * Download file from R2 via Worker gateway
   */
  async download(identifier: string): Promise<ProviderDownloadResult> {
    const { result, timeMs } = await this.measureTime(async () => {
      try {
        const response = await fetch(`${WORKER_URL}/r2/${identifier}`);

        if (!response.ok) {
          return { success: false, data: new Uint8Array(), error: `Download failed: ${response.status}` };
        }

        const arrayBuffer = await response.arrayBuffer();
        return { success: true, data: new Uint8Array(arrayBuffer) };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[R2Provider] Download failed:', errorMessage);
        return { success: false, data: new Uint8Array(), error: errorMessage };
      }
    });

    if (!result.success) {
      return {
        success: false,
        provider: this.type,
        data: new Uint8Array(),
        downloadTimeMs: timeMs,
        error: result.error,
      };
    }

    return {
      success: true,
      provider: this.type,
      data: result.data,
      downloadTimeMs: timeMs,
    };
  }

  /**
   * Get access URL for R2 object (via Worker gateway)
   */
  getAccessUrl(identifier: string): string {
    return `${WORKER_URL}/r2/${identifier}`;
  }

  /**
   * Delete file from R2 via Worker gateway
   */
  async delete(identifier: string): Promise<boolean> {
    try {
      const authToken = await this.getAuthToken();

      const response = await fetch(`${WORKER_URL}/r2/${identifier}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('[R2Provider] Delete failed:', error);
      return false;
    }
  }

  /**
   * Check if object exists via Worker gateway
   */
  async exists(identifier: string): Promise<boolean> {
    try {
      const response = await fetch(`${WORKER_URL}/r2/${identifier}`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List objects by prefix via Worker gateway
   */
  async listByPrefix(prefix: string, limit = 100): Promise<Array<{ key: string; size: number; uploaded: string }>> {
    try {
      const authToken = await this.getAuthToken();

      const response = await fetch(`${WORKER_URL}/r2/list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prefix, limit }),
      });

      if (!response.ok) return [];

      const data = await response.json() as { objects: Array<{ key: string; size: number; uploaded: string }> };
      return data.objects;
    } catch {
      return [];
    }
  }

  /**
   * Get auth token from Clerk session (injected via window.__clerk_session)
   */
  private async getAuthToken(): Promise<string> {
    // Try Clerk's getToken if available
    if (typeof window !== 'undefined' && (window as any).__clerk_session?.getToken) {
      const token = await (window as any).__clerk_session.getToken();
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

// Export singleton instance
export const r2Provider = new R2Provider();
