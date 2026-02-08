/**
 * Cloudflare R2 Storage Provider
 *
 * S3-compatible object storage with zero egress fees.
 * Primary storage provider for BlockDrive encrypted files.
 *
 * Benefits:
 * - Zero egress fees (vs $0.09/GB on S3)
 * - S3-compatible API
 * - Edge caching via Cloudflare CDN
 * - Direct integration with Workers
 *
 * @see https://developers.cloudflare.com/r2/
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { StorageProviderBase } from './storageProviderBase';
import {
  StorageProviderType,
  ProviderCapabilities,
  ProviderHealthCheck,
  ProviderUploadResult,
  ProviderDownloadResult,
} from '@/types/storageProvider';

// R2 Configuration
const R2_ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME || 'blockdrive-storage';
const R2_CUSTOM_DOMAIN = import.meta.env.VITE_R2_CUSTOM_DOMAIN || '';

// R2 endpoint URL
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

/**
 * Check if R2 provider is configured
 */
export function isR2Configured(): boolean {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

/**
 * Cloudflare R2 Storage Provider
 */
export class R2Provider extends StorageProviderBase {
  readonly type: StorageProviderType = 'r2';
  readonly name = 'Cloudflare R2';

  readonly capabilities: ProviderCapabilities = {
    supportsEncryption: true,
    supportsPermanentStorage: false, // R2 is not permanent like Arweave
    supportsLargeFiles: true,
    maxFileSizeMB: 5120, // 5GB with multipart
    averageLatencyMs: 50, // Edge-cached responses are very fast
    costPerGBCents: 1.5, // $0.015/GB/month storage, zero egress
  };

  private client: S3Client;

  constructor() {
    super();

    this.client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Check R2 provider health
   */
  async checkHealth(): Promise<ProviderHealthCheck> {
    const startTime = performance.now();

    try {
      // Try to head a known object or list bucket
      await this.client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: '.health-check',
        })
      );

      const latencyMs = Math.round(performance.now() - startTime);

      return {
        provider: this.type,
        status: 'available',
        latencyMs,
        lastChecked: Date.now(),
      };
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - startTime);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // 404 is expected if health check object doesn't exist - R2 is still available
      if (errorMessage.includes('404') || errorMessage.includes('NotFound')) {
        return {
          provider: this.type,
          status: 'available',
          latencyMs,
          lastChecked: Date.now(),
        };
      }

      return {
        provider: this.type,
        status: 'unavailable',
        latencyMs,
        lastChecked: Date.now(),
        errorMessage,
      };
    }
  }

  /**
   * Upload file to R2
   */
  async upload(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult> {
    const { result, timeMs } = await this.measureTime(async () => {
      // Generate unique key with timestamp for deduplication
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const key = `files/${timestamp}/${sanitizedFileName}`;

      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: data,
            ContentType: contentType,
            Metadata: {
              'x-blockdrive-uploaded-at': new Date().toISOString(),
              'x-blockdrive-encryption': 'aes-256-gcm',
              'x-blockdrive-original-name': fileName,
              ...metadata,
            },
          })
        );

        return { success: true, key };
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
        bucket: R2_BUCKET_NAME,
        key: result.key,
        ...metadata,
      },
      uploadTimeMs: timeMs,
    };
  }

  /**
   * Download file from R2
   */
  async download(identifier: string): Promise<ProviderDownloadResult> {
    const { result, timeMs } = await this.measureTime(async () => {
      try {
        const response = await this.client.send(
          new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: identifier,
          })
        );

        if (!response.Body) {
          return { success: false, data: new Uint8Array(), error: 'Empty response body' };
        }

        // Convert stream to Uint8Array
        const chunks: Uint8Array[] = [];
        const reader = response.Body.transformToWebStream().getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const data = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          data.set(chunk, offset);
          offset += chunk.length;
        }

        return { success: true, data };
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
   * Get public access URL for R2 object
   */
  getAccessUrl(identifier: string): string {
    // Use custom domain if configured (recommended for production)
    if (R2_CUSTOM_DOMAIN) {
      return `https://${R2_CUSTOM_DOMAIN}/${identifier}`;
    }

    // Fall back to R2.dev URL (requires public bucket or signed URLs)
    return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${identifier}`;
  }

  /**
   * Delete file from R2
   */
  async delete(identifier: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: identifier,
        })
      );
      return true;
    } catch (error) {
      console.error('[R2Provider] Delete failed:', error);
      return false;
    }
  }

  /**
   * Generate signed URL for private access (if needed)
   */
  async getSignedUrl(identifier: string, expiresInSeconds: number = 3600): Promise<string> {
    // For now, return the public URL
    // In production, implement presigned URLs using @aws-sdk/s3-request-presigner
    return this.getAccessUrl(identifier);
  }

  /**
   * Check if object exists
   */
  async exists(identifier: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: identifier,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const r2Provider = new R2Provider();
