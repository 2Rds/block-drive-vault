
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useDynamicAuth } from '@/contexts/DynamicAuthContext';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useIPFSUpload = () => {
  const { user, session } = useAuth();
  const { supabase: authSupabase } = useDynamicAuth();
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userFiles, setUserFiles] = useState<IPFSFile[]>([]);
  const [loading, setLoading] = useState(false);

  const uploadToIPFS = async (files: FileList, folderPath?: string) => {
    if (!user) {
      toast.error('Please connect your wallet first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadedFiles: IPFSFile[] = [];
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const file = files[i];

        // Create form data for the file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folderPath', folderPath || '/');

        // Upload via edge function (using stored Pinata secrets)
        // Use the session access token for proper JWT authentication
        const { data, error } = await supabase.functions.invoke('upload-to-ipfs', {
          body: formData,
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });

        if (error) {
          console.error('Upload error:', error);
          throw new Error(error.message || 'Upload failed');
        }

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        uploadedFiles.push(data.file);
        
        // Update progress
        const progress = ((i + 1) / totalFiles) * 100;
        setUploadProgress(progress);
      }
      
      if (uploadedFiles.length > 0) {
        setUserFiles(prev => [...prev, ...uploadedFiles]);
        toast.success(`Successfully uploaded ${files.length} file(s) to IPFS!`);
        
        // Reload files to ensure we have the latest data
        await loadUserFiles();
        return uploadedFiles;
      }
      
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
    setDownloading(true);
    try {
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(downloadUrl);
      toast.success(`Downloaded ${filename} successfully!`);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloading(false);
    }
  };

  const deleteFromIPFS = async (fileId: string, cid: string) => {
    if (!user) return;

    try {
      await FileDatabaseService.deleteFile(fileId, user.id, authSupabase);
      
      // Update local state
      setUserFiles(prev => prev.filter(file => file.id !== fileId));
      
      toast.success('File deleted successfully!');
      
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadUserFiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const ipfsFiles = await FileDatabaseService.loadUserFiles(user.id, authSupabase);
      setUserFiles(ipfsFiles);
    } catch (error) {
      console.error('Failed to load user files:', error);
      toast.error('Failed to load your files');
    } finally {
      setLoading(false);
    }
  };

  // Load files on mount and when user changes
  useEffect(() => {
    if (user) {
      loadUserFiles();
    }
  }, [user?.id]);

  return {
    uploading,
    downloading,
    uploadProgress,
    userFiles,
    loading,
    uploadToIPFS,
    downloadFromIPFS,
    deleteFromIPFS,
    loadUserFiles
  };
};
