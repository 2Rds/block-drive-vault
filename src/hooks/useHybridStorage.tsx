import { useState } from 'react';
import { useAuth } from './useAuth';
import { HybridStorageService, StorageStrategy } from '@/services/hybridStorageService';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';

export const useHybridStorage = () => {
  const { user, session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userFiles, setUserFiles] = useState<IPFSFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageAnalysis, setStorageAnalysis] = useState<StorageStrategy | null>(null);

  const analyzeFiles = (files: FileList): StorageStrategy[] => {
    const analyses: StorageStrategy[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const analysis = HybridStorageService.analyzeFile(files[i]);
      analyses.push(analysis);
    }
    
    return analyses;
  };

  const uploadFiles = async (files: FileList, folderPath?: string) => {
    if (!user) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Check if we have either a custom wallet session or Supabase session
    const hasValidSession = session || localStorage.getItem('sb-supabase-auth-token');
    if (!hasValidSession) {
      toast.error('Authentication session expired. Please reconnect your wallet.');
      return;
    }

    console.log('User authenticated for hybrid upload:', { 
      userId: user.id, 
      hasSession: !!session,
      hasStoredSession: !!localStorage.getItem('sb-supabase-auth-token')
    });

    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Analyze files and show user the storage strategy
      const strategies = analyzeFiles(files);
      const inscriptionCount = strategies.filter(s => s.type === 'solana-inscription').length;
      const ipfsCount = strategies.filter(s => s.type === 'ipfs').length;
      
      if (inscriptionCount > 0 && ipfsCount > 0) {
        toast.info(`Using hybrid storage: ${inscriptionCount} files → Solana Inscription, ${ipfsCount} files → IPFS`);
      } else if (inscriptionCount > 0) {
        toast.info(`Using Solana Inscription for ${inscriptionCount} file(s) - permanent on-chain storage`);
      } else {
        toast.info(`Using IPFS for ${ipfsCount} file(s) - distributed storage`);
      }
      
      const results = await HybridStorageService.uploadFiles(
        files,
        user,
        folderPath,
        setUploadProgress
      );
      
      const successfulUploads = results.filter(r => r.success);
      
      if (successfulUploads.length > 0) {
        toast.success(`Successfully uploaded ${successfulUploads.length} file(s) using hybrid storage!`);
        
        // Reload files to ensure we have the latest data
        await loadUserFiles();
        return results;
      } else {
        toast.error('All uploads failed');
        return null;
      }
      
    } catch (error) {
      console.error('Hybrid upload failed:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadFile = async (fileRecord: IPFSFile) => {
    setDownloading(true);
    try {
      await HybridStorageService.downloadFile(fileRecord);
      
      const storageType = fileRecord.metadata?.storage_type || 'ipfs';
      toast.success(`Downloaded from ${storageType === 'solana-inscription' ? 'Solana Inscription' : 'IPFS'}`);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const deleteFile = async (fileId: string, storageId: string) => {
    if (!user) return;
    
    try {
      // For now, we'll only delete the database record
      // Solana inscriptions are permanent and cannot be deleted
      // IPFS files can be unpinned but we'll keep them for redundancy
      await FileDatabaseService.deleteFile(fileId, user.id);
      
      // Update local state
      setUserFiles(prev => prev.filter(file => file.id !== fileId));
      
      toast.success('File record deleted successfully!');
      
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadUserFiles = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log('Loading hybrid storage files for user:', user.id);
      const files = await FileDatabaseService.loadUserFiles(user.id);
      console.log('Loaded hybrid storage files:', files);
      setUserFiles(files);
    } catch (error) {
      console.error('Failed to load user files:', error);
      toast.error('Failed to load your files');
    } finally {
      setLoading(false);
    }
  };

  return {
    uploading,
    downloading,
    uploadProgress,
    userFiles,
    loading,
    storageAnalysis,
    analyzeFiles,
    uploadFiles,
    downloadFile,
    deleteFile,
    loadUserFiles
  };
};
