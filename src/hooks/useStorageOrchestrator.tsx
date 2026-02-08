/**
 * Storage Orchestrator Hook
 * 
 * React hook for using the multi-provider storage system.
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  storageOrchestrator,
  StorageProviderType,
  StorageConfig,
  DEFAULT_STORAGE_CONFIG,
  ProviderHealthCheck,
  MultiProviderUploadResult,
  StorageManifest
} from '@/services/storage';
import { toast } from 'sonner';

interface UseStorageOrchestratorReturn {
  // State
  isUploading: boolean;
  isDownloading: boolean;
  healthStatus: Map<StorageProviderType, ProviderHealthCheck>;
  
  // Actions
  upload: (
    file: File,
    config?: StorageConfig,
    metadata?: Record<string, string>
  ) => Promise<MultiProviderUploadResult | null>;
  
  uploadEncrypted: (
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config?: StorageConfig,
    metadata?: Record<string, string>
  ) => Promise<MultiProviderUploadResult | null>;
  
  uploadChunked: (
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config?: StorageConfig,
    metadata?: Record<string, string>
  ) => Promise<StorageManifest | null>;
  
  download: (
    identifiers: Map<StorageProviderType, string>,
    preferredProvider?: StorageProviderType
  ) => Promise<Uint8Array | null>;
  
  downloadChunked: (manifest: StorageManifest) => Promise<Uint8Array | null>;
  
  refreshHealth: () => Promise<void>;
}

export function useStorageOrchestrator(): UseStorageOrchestratorReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Map<StorageProviderType, ProviderHealthCheck>>(
    new Map()
  );

  // Initial health check
  useEffect(() => {
    refreshHealth();
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const status = await storageOrchestrator.checkAllHealth();
      setHealthStatus(status);
    } catch (error) {
      console.error('Failed to check provider health:', error);
    }
  }, []);

  const upload = useCallback(async (
    file: File,
    config: StorageConfig = DEFAULT_STORAGE_CONFIG,
    metadata?: Record<string, string>
  ): Promise<MultiProviderUploadResult | null> => {
    setIsUploading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      const result = await storageOrchestrator.uploadWithRedundancy(
        data,
        file.name,
        file.type || 'application/octet-stream',
        config,
        metadata
      );

      if (result.success) {
        toast.success(`Uploaded to ${result.successfulProviders} provider(s)`);
      } else {
        toast.error('Upload failed');
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadEncrypted = useCallback(async (
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config: StorageConfig = DEFAULT_STORAGE_CONFIG,
    metadata?: Record<string, string>
  ): Promise<MultiProviderUploadResult | null> => {
    setIsUploading(true);
    
    try {
      const result = await storageOrchestrator.uploadWithRedundancy(
        data,
        fileName,
        contentType,
        config,
        { ...metadata, encrypted: 'true' }
      );

      if (result.success) {
        toast.success(`Encrypted file uploaded to ${result.successfulProviders} provider(s)`);
      } else {
        toast.error('Encrypted upload failed');
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Encrypted upload failed';
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const uploadChunked = useCallback(async (
    data: Uint8Array,
    fileName: string,
    contentType: string,
    config: StorageConfig = DEFAULT_STORAGE_CONFIG,
    metadata?: Record<string, string>
  ): Promise<StorageManifest | null> => {
    setIsUploading(true);
    
    try {
      const manifest = await storageOrchestrator.uploadChunked(
        data,
        fileName,
        contentType,
        config,
        metadata
      );

      toast.success(`Uploaded ${manifest.chunkCount} chunks`);
      return manifest;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chunked upload failed';
      toast.error(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const download = useCallback(async (
    identifiers: Map<StorageProviderType, string>,
    preferredProvider?: StorageProviderType
  ): Promise<Uint8Array | null> => {
    setIsDownloading(true);
    
    try {
      const result = await storageOrchestrator.downloadWithFallback(
        identifiers,
        preferredProvider
      );

      if (result.success) {
        return result.data;
      } else {
        toast.error(result.error || 'Download failed');
        return null;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      toast.error(message);
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  const downloadChunked = useCallback(async (
    manifest: StorageManifest
  ): Promise<Uint8Array | null> => {
    setIsDownloading(true);
    
    try {
      const data = await storageOrchestrator.downloadChunked(manifest);
      toast.success('File reconstructed successfully');
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chunked download failed';
      toast.error(message);
      return null;
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return {
    isUploading,
    isDownloading,
    healthStatus,
    upload,
    uploadEncrypted,
    uploadChunked,
    download,
    downloadChunked,
    refreshHealth
  };
}
