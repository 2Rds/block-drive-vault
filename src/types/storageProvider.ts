/**
 * Storage Provider Types
 *
 * Defines interfaces for multi-provider storage orchestration
 * supporting Cloudflare R2, Filebase (IPFS), S3, and Arweave.
 */

// Supported storage providers
export type StorageProviderType = 'filebase' | 's3' | 'arweave' | 'r2';

// Provider status
export type ProviderStatus = 'available' | 'degraded' | 'unavailable';

// Storage provider capabilities
export interface ProviderCapabilities {
  supportsEncryption: boolean;
  supportsPermanentStorage: boolean;
  supportsLargeFiles: boolean;
  maxFileSizeMB: number;
  averageLatencyMs: number;
  costPerGBCents: number;
}

// Provider health check result
export interface ProviderHealthCheck {
  provider: StorageProviderType;
  status: ProviderStatus;
  latencyMs: number;
  lastChecked: number;
  errorMessage?: string;
}

// Upload result from a single provider
export interface ProviderUploadResult {
  success: boolean;
  provider: StorageProviderType;
  identifier: string;       // CID for IPFS, key for S3, txId for Arweave
  url: string;              // Direct access URL
  metadata?: Record<string, string>;
  uploadTimeMs: number;
  error?: string;
}

// Multi-provider upload result
export interface MultiProviderUploadResult {
  success: boolean;
  primaryProvider: StorageProviderType;
  primaryResult: ProviderUploadResult;
  backupResults: ProviderUploadResult[];
  totalProviders: number;
  successfulProviders: number;
  fileId: string;
  commitment?: string;      // For BlockDrive encrypted files
}

// Download result
export interface ProviderDownloadResult {
  success: boolean;
  provider: StorageProviderType;
  data: Uint8Array;
  downloadTimeMs: number;
  error?: string;
}

// Storage configuration for a file
export interface StorageConfig {
  primaryProvider: StorageProviderType;
  backupProviders: StorageProviderType[];
  redundancyLevel: 1 | 2 | 3;  // How many providers to use
  preferPermanent: boolean;    // Prefer permanent storage (Arweave)
  encryptionRequired: boolean;
}

// Default storage configurations
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  primaryProvider: 'filebase',
  backupProviders: ['s3'],
  redundancyLevel: 2,
  preferPermanent: false,
  encryptionRequired: true
};

export const HIGH_RELIABILITY_CONFIG: StorageConfig = {
  primaryProvider: 'filebase',
  backupProviders: ['s3', 'arweave'],
  redundancyLevel: 3,
  preferPermanent: true,
  encryptionRequired: true
};

// R2-primary configuration (recommended for cost savings)
// Zero egress fees with Cloudflare R2
export const R2_PRIMARY_CONFIG: StorageConfig = {
  primaryProvider: 'r2',
  backupProviders: ['filebase', 's3'],
  redundancyLevel: 2,
  preferPermanent: false,
  encryptionRequired: true
};

// R2 with permanent backup on Arweave
export const R2_PERMANENT_CONFIG: StorageConfig = {
  primaryProvider: 'r2',
  backupProviders: ['arweave'],
  redundancyLevel: 2,
  preferPermanent: true,
  encryptionRequired: true
};

// File chunk for distributed storage
export interface FileChunk {
  index: number;
  data: Uint8Array;
  hash: string;
  size: number;
}

// Chunked upload tracking
export interface ChunkedUploadSession {
  sessionId: string;
  fileName: string;
  totalChunks: number;
  chunkSize: number;
  uploadedChunks: number[];
  chunkResults: Map<number, ProviderUploadResult>;
  startedAt: number;
  status: 'pending' | 'uploading' | 'complete' | 'failed';
}

// Storage manifest for file reconstruction
export interface StorageManifest {
  fileId: string;
  fileName: string;
  totalSize: number;
  chunkCount: number;
  chunks: Array<{
    index: number;
    provider: StorageProviderType;
    identifier: string;
    size: number;
    hash: string;
  }>;
  createdAt: number;
  commitment?: string;
  securityLevel?: number;
}
