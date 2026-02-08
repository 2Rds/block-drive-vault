/**
 * Storage Provider Base Interface
 * 
 * Abstract interface that all storage providers must implement.
 */

import { 
  StorageProviderType, 
  ProviderCapabilities,
  ProviderHealthCheck,
  ProviderUploadResult,
  ProviderDownloadResult 
} from '@/types/storageProvider';

export interface IStorageProvider {
  // Provider identification
  readonly type: StorageProviderType;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  // Health check
  checkHealth(): Promise<ProviderHealthCheck>;
  
  // Upload operations
  upload(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult>;

  // Download operations
  download(identifier: string): Promise<ProviderDownloadResult>;

  // URL generation
  getAccessUrl(identifier: string): string;

  // Deletion (if supported)
  delete?(identifier: string): Promise<boolean>;
}

/**
 * Base class with shared functionality
 */
export abstract class StorageProviderBase implements IStorageProvider {
  abstract readonly type: StorageProviderType;
  abstract readonly name: string;
  abstract readonly capabilities: ProviderCapabilities;

  abstract checkHealth(): Promise<ProviderHealthCheck>;
  abstract upload(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult>;
  abstract download(identifier: string): Promise<ProviderDownloadResult>;
  abstract getAccessUrl(identifier: string): string;

  // Utility method to measure operation time
  protected async measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await operation();
    const timeMs = Math.round(performance.now() - start);
    return { result, timeMs };
  }

  // Create error result
  protected createErrorResult(error: string, timeMs: number): ProviderUploadResult {
    return {
      success: false,
      provider: this.type,
      identifier: '',
      url: '',
      uploadTimeMs: timeMs,
      error
    };
  }
}
