
import { useState } from 'react';
import { useAuth } from './useAuth';
import { FileDatabaseService } from '@/services/fileDatabaseService';
import { IPFSFile } from '@/types/ipfs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useIPFSUpload = () => {
  const { user, session } = useAuth();
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
        console.log(`Uploading file ${i + 1}/${totalFiles}: ${file.name}`);

        // Upload directly to Pinata
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pinataMetadata', JSON.stringify({
          name: file.name,
        }));
        formData.append('pinataOptions', JSON.stringify({
          cidVersion: 1,
        }));

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            'pinata_api_key': 'f684a12c1928d962d5bd',
            'pinata_secret_api_key': 'a4390de4be6c88fc8b587f9057b0a878678714b09152c4a08e0b9eef7d5d1e41',
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pinata upload failed: ${response.status} - ${errorText}`);
        }

        const pinataResult = await response.json();
        const ipfsUrl = `https://gray-acceptable-grouse-462.mypinata.cloud/ipfs/${pinataResult.IpfsHash}`;

        // Save to database
        const { data: savedFile, error: saveError } = await supabase
          .from('files')
          .insert({
            filename: file.name,
            file_path: `${folderPath || '/'}${(folderPath || '/').endsWith('/') ? '' : '/'}${file.name}`,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
            user_id: user.id,
            folder_path: folderPath || '/',
            storage_provider: 'ipfs',
            ipfs_cid: pinataResult.IpfsHash,
            ipfs_url: ipfsUrl,
            metadata: {
              storage_type: 'ipfs',
              permanence: 'permanent',
              blockchain: 'ipfs'
            }
          })
          .select()
          .single();

        if (saveError) {
          console.error('Database save error:', saveError);
          throw new Error(`Failed to save file metadata: ${saveError.message}`);
        }

        const ipfsFile: IPFSFile = {
          id: savedFile.id,
          filename: savedFile.filename,
          cid: savedFile.ipfs_cid!,
          size: savedFile.file_size!,
          contentType: savedFile.content_type!,
          ipfsUrl: savedFile.ipfs_url!,
          uploadedAt: savedFile.created_at,
          userId: savedFile.user_id,
          folderPath: savedFile.folder_path!,
          metadata: savedFile.metadata as any
        };

        uploadedFiles.push(ipfsFile);
        
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
      await FileDatabaseService.deleteFile(fileId, user.id);
      
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
      console.log('Loading IPFS files for user:', user.id);
      const ipfsFiles = await FileDatabaseService.loadUserFiles(user.id);
      console.log('Loaded IPFS files:', ipfsFiles);
      setUserFiles(ipfsFiles);
    } catch (error) {
      console.error('Failed to load user files:', error);
      toast.error('Failed to load your IPFS files');
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
    uploadToIPFS,
    downloadFromIPFS,
    deleteFromIPFS,
    loadUserFiles
  };
};
