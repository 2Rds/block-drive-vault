
import { useState } from 'react';
import { useAuth } from './useAuth';
import { IPFSUploadService } from '@/services/ipfsUploadService';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';

export const useIPFSUpload = () => {
  const { user, session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userFiles, setUserFiles] = useState<IPFSFile[]>([]);

  const uploadToIPFS = async (files: FileList, folderPath?: string) => {
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

    console.log('User authenticated for upload:', { 
      userId: user.id, 
      hasSession: !!session,
      hasStoredSession: !!localStorage.getItem('sb-supabase-auth-token')
    });

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedFiles = await IPFSUploadService.uploadFiles(
        files,
        user,
        folderPath,
        setUploadProgress
      );
      
      setUserFiles(prev => [...prev, ...uploadedFiles]);
      toast.success(`Successfully uploaded ${files.length} file(s) to IPFS!`);
      
      return uploadedFiles;
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadFromIPFS = async (cid: string, filename: string) => {
    try {
      await IPFSUploadService.downloadFile(cid, filename);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteFromIPFS = async (fileId: string, cid: string) => {
    if (!user) return;
    
    try {
      await IPFSUploadService.deleteFile(fileId, cid, user.id);
      
      // Update local state
      setUserFiles(prev => prev.filter(file => file.id !== fileId));
      
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadUserFiles = async () => {
    if (!user) return;
    
    try {
      const ipfsFiles = await FileDatabaseService.loadUserFiles(user.id);
      setUserFiles(ipfsFiles);
    } catch (error) {
      console.error('Failed to load user files:', error);
      toast.error('Failed to load your files');
    }
  };

  return {
    uploading,
    uploadProgress,
    userFiles,
    uploadToIPFS,
    downloadFromIPFS,
    deleteFromIPFS,
    loadUserFiles
  };
};
