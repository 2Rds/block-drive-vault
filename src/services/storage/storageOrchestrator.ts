/**
 * Storage Orchestrator
 * 
 * Coordinates multi-provider storage with automatic failover,
 * redundancy management, and health monitoring.
 */

import { 
  StorageProviderType,
  StorageConfig,
  DEFAULT_STORAGE_CONFIG,
  ProviderHealthCheck,
  ProviderUploadResult,
  MultiProviderUploadResult,
  ProviderDownloadResult,
  FileChunk,
  StorageManifest
} from '@/types/storageProvider';
import { IStorageProvider } from './storageProviderBase';
import { FilebaseProvider } from './filebaseProvider';
import { S3Provider } from './s3Provider';
import { ArweaveProvider } from './arweaveProvider';
import { R2Provider, isR2Configured } from './r2Provider';
import { sha256, bytesToHex } from '../crypto/cryptoUtils';

// Chunk size: 256KB as per architecture spec
const CHUNK_SIZE = 256 * 1024;

class StorageOrchestratorService {
  private providers: Map<StorageProviderType, IStorageProvider>;
  private healthStatus: Map<StorageProviderType, ProviderHealthCheck>;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute

  constructor() {
    this.providers = new Map();
    this.healthStatus = new Map();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    this.providers.set('filebase', new FilebaseProvider());
    this.providers.set('s3', new S3Provider());
    this.providers.set('arweave', new ArweaveProvider());

    // Initialize R2 provider if configured (primary storage for cost savings)
    if (isR2Configured()) {
      this.providers.set('r2', new R2Provider());
      console.log('[StorageOrchestrator] R2 provider initialized (zero egress fees)');
    }
  }

  /**
   * Get a specific provider
   */
  getProvider(type: StorageProviderType): IStorageProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Check health of all providers
   */
  async checkAllHealth(): Promise<Map<StorageProviderType, ProviderHealthCheck>> {
    const checks = await Promise.all(
      Array.from(this.providers.entries()).map(async ([type, provider]) => {
        const health = await provider.checkHealth();
        this.healthStatus.set(type, health);
        return [type, health] as [StorageProviderType, ProviderHealthCheck];
      })
    );

    this.lastHealthCheck = Date.now();
    return new Map(checks);
  }

  /**
   * Get best available provider based on health and config
   */
  async getBestProvider(
    config: StorageConfig = DEFAULT_STORAGE_CONFIG
  ): Promise<StorageProviderType> {
    // Check if we need to refresh health status
    if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkAllHealth();
    }

    // Try primary first
    const primaryHealth = this.healthStatus.get(config.primaryProvider);
    if (primaryHealth?.status === 'available') {
      return config.primaryProvider;
    }

    // Try backups in order
    for (const backup of config.backupProviders) {
      const backupHealth = this.healthStatus.get(backup);
      if (backupHealth?.status === 'available') {
        console.log(`[StorageOrchestrator] Falling back from ${config.primaryProvider} to ${backup}`);
        return backup;
      }
    }

    // Return primary even if degraded
    console.warn('[StorageOrchestrator] No healthy providers, using primary');
    return config.primaryProvider;
  }

  /**
   * Upload to a single provider
   */
  async uploadToProvider(
    providerType: StorageProviderType,
    data: Uint8Array,
    fileName: string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<ProviderUploadResult> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return {
        success: false,
        provider: providerType,
        identifier: '',
        url: '',
        uploadTimeMs: 0,
        error: `Provider ${providerType} not found`
      };
    }

    return provider.upload(data, fileName, contentType, metadata);
  }

  /**
   * Upload with redundancy to multiple providers
   */
  async uploadWithRedundancy(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config: StorageConfig = DEFAULT_STORAGE_CONFIG,
    metadata?: Record<string, string>
  ): Promise<MultiProviderUploadResult> {
    const results: ProviderUploadResult[] = [];
    const fileId = await this.generateFileId(data, fileName);

    // Determine which providers to use
    const providersToUse: StorageProviderType[] = [config.primaryProvider];
    
    // Add backup providers based on redundancy level
    for (let i = 0; i < config.redundancyLevel - 1 && i < config.backupProviders.length; i++) {
      providersToUse.push(config.backupProviders[i]);
    }

    // Upload to all providers in parallel
    const uploadPromises = providersToUse.map(providerType =>
      this.uploadToProvider(providerType, data, fileName, contentType, metadata)
    );

    const uploadResults = await Promise.allSettled(uploadPromises);

    // Process results
    for (const result of uploadResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[StorageOrchestrator] Upload failed:', result.reason);
      }
    }

    // Find primary result
    const primaryResult = results.find(r => r.provider === config.primaryProvider) || results[0];
    const backupResults = results.filter(r => r.provider !== config.primaryProvider);
    const successfulProviders = results.filter(r => r.success).length;

    return {
      success: successfulProviders > 0,
      primaryProvider: config.primaryProvider,
      primaryResult,
      backupResults,
      totalProviders: providersToUse.length,
      successfulProviders,
      fileId
    };
  }

  /**
   * Download with automatic fallback
   */
  async downloadWithFallback(
    identifiers: Map<StorageProviderType, string>,
    preferredProvider?: StorageProviderType
  ): Promise<ProviderDownloadResult> {
    // Build provider order
    const providerOrder: StorageProviderType[] = [];
    
    if (preferredProvider && identifiers.has(preferredProvider)) {
      providerOrder.push(preferredProvider);
    }
    
    // Add remaining providers
    for (const provider of identifiers.keys()) {
      if (!providerOrder.includes(provider)) {
        providerOrder.push(provider);
      }
    }

    // Try each provider in order
    for (const providerType of providerOrder) {
      const identifier = identifiers.get(providerType);
      if (!identifier) continue;

      const provider = this.providers.get(providerType);
      if (!provider) continue;

      try {
        const result = await provider.download(identifier);
        if (result.success) {
          return result;
        }
        console.warn(`[StorageOrchestrator] Download from ${providerType} failed, trying next`);
      } catch (error) {
        console.error(`[StorageOrchestrator] Download error from ${providerType}:`, error);
      }
    }

    return {
      success: false,
      provider: providerOrder[0] || 'filebase',
      data: new Uint8Array(0),
      downloadTimeMs: 0,
      error: 'All download attempts failed'
    };
  }

  /**
   * Chunk a file for distributed storage
   */
  async chunkFile(data: Uint8Array): Promise<FileChunk[]> {
    const chunks: FileChunk[] = [];
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.length);
      const chunkData = data.slice(start, end);
      const hash = await sha256(chunkData);

      chunks.push({
        index: i,
        data: chunkData,
        hash,
        size: chunkData.length
      });
    }

    return chunks;
  }

  /**
   * Upload chunked file with redundancy
   */
  async uploadChunked(
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config: StorageConfig = DEFAULT_STORAGE_CONFIG,
    metadata?: Record<string, string>
  ): Promise<StorageManifest> {
    const chunks = await this.chunkFile(data);
    const fileId = await this.generateFileId(data, fileName);

    const chunkManifest: StorageManifest['chunks'] = [];

    // Upload each chunk
    for (const chunk of chunks) {
      const chunkFileName = `${fileId}_chunk_${chunk.index}`;
      const result = await this.uploadWithRedundancy(
        chunk.data,
        chunkFileName,
        'application/octet-stream',
        config,
        { ...metadata, chunkIndex: chunk.index.toString(), parentFile: fileId }
      );

      if (result.success) {
        chunkManifest.push({
          index: chunk.index,
          provider: result.primaryProvider,
          identifier: result.primaryResult.identifier,
          size: chunk.size,
          hash: chunk.hash
        });
      } else {
        throw new Error(`Failed to upload chunk ${chunk.index}`);
      }
    }

    return {
      fileId,
      fileName,
      totalSize: data.length,
      chunkCount: chunks.length,
      chunks: chunkManifest,
      createdAt: Date.now()
    };
  }

  /**
   * Download and reconstruct chunked file
   */
  async downloadChunked(manifest: StorageManifest): Promise<Uint8Array> {
    const chunks: Uint8Array[] = new Array(manifest.chunkCount);

    // Download all chunks in parallel
    const downloadPromises = manifest.chunks.map(async (chunkInfo) => {
      const identifiers = new Map<StorageProviderType, string>();
      identifiers.set(chunkInfo.provider, chunkInfo.identifier);

      const result = await this.downloadWithFallback(identifiers, chunkInfo.provider);
      
      if (!result.success) {
        throw new Error(`Failed to download chunk ${chunkInfo.index}`);
      }

      // Verify chunk hash
      const actualHash = await sha256(result.data);
      if (actualHash !== chunkInfo.hash) {
        throw new Error(`Chunk ${chunkInfo.index} hash mismatch`);
      }

      chunks[chunkInfo.index] = result.data;
    });

    await Promise.all(downloadPromises);

    // Reconstruct file
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  /**
   * Generate unique file ID
   */
  private async generateFileId(data: Uint8Array, fileName: string): Promise<string> {
    const input = new TextEncoder().encode(`${fileName}-${Date.now()}-${data.length}`);
    const combined = new Uint8Array(input.length + Math.min(data.length, 1024));
    combined.set(input);
    combined.set(data.slice(0, 1024), input.length);
    
    const hash = await sha256(combined);
    return hash.slice(0, 32);
  }

  /**
   * Get provider health status
   */
  getHealthStatus(): Map<StorageProviderType, ProviderHealthCheck> {
    return new Map(this.healthStatus);
  }
}

// Export singleton instance
export const storageOrchestrator = new StorageOrchestratorService();
