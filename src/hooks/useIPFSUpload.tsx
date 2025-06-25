import { useState } from 'react';
import { useAuth } from './useAuth';
import { IPFSService } from '@/services/ipfsService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IPFSFile {
  id: string;
  filename: string;
  cid: string;
  size: number;
  contentType: string;
  ipfsUrl: string;
  uploadedAt: string;
  userId: string;
  folderPath?: string;
}

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
      console.log(`Uploading ${files.length} files to IPFS...`);
      
      const uploadedFiles: IPFSFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 1) / files.length) * 50); // First 50% for IPFS upload
        
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
        
        // Upload to IPFS
        const ipfsResult = await IPFSService.uploadFile(file);
        if (!ipfsResult) {
          throw new Error(`Failed to upload ${file.name} to IPFS`);
        }
        
        console.log('IPFS upload result:', ipfsResult);
        
        // Pin the file to ensure availability
        await IPFSService.pinFile(ipfsResult.cid);
        
        // First, get or create the user's wallet record
        let { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (walletError && walletError.code !== 'PGRST116') {
          console.error('Error fetching wallet:', walletError);
          throw new Error(`Failed to fetch wallet: ${walletError.message}`);
        }
        
        if (!walletData) {
          // Create a wallet record if it doesn't exist
          const walletAddress = user.wallet_address || 
                               user.user_metadata?.wallet_address || 
                               user.id;
          
          const { data: newWallet, error: createWalletError } = await supabase
            .from('wallets')
            .insert({
              user_id: user.id,
              wallet_address: walletAddress,
              public_key: '',
              private_key_encrypted: '',
              blockchain_type: user.user_metadata?.blockchain_type || 'ethereum'
            })
            .select('id')
            .single();
          
          if (createWalletError) {
            console.error('Failed to create wallet:', createWalletError);
            throw new Error(`Failed to setup wallet for user: ${createWalletError.message}`);
          }
          
          walletData = newWallet;
        }
        
        console.log('Using wallet ID:', walletData.id);
        
        // Store metadata in Supabase
        const fileData = {
          user_id: user.id,
          wallet_id: walletData.id,
          filename: ipfsResult.filename,
          file_path: `/${ipfsResult.filename}`,
          content_type: ipfsResult.contentType,
          file_size: ipfsResult.size,
          ipfs_cid: ipfsResult.cid,
          ipfs_url: ipfsResult.url,
          folder_path: folderPath || '/',
          storage_provider: 'ipfs',
          is_encrypted: false,
          metadata: {
            originalName: file.name,
            uploadedVia: 'blockdrive-web',
            ipfsGateway: 'https://ipfs.io'
          }
        };
        
        console.log('Inserting file data:', fileData);
        
        const { data: dbFile, error: dbError } = await supabase
          .from('files')
          .insert(fileData)
          .select()
          .single();
        
        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Failed to save ${file.name} metadata: ${dbError.message}`);
        }
        
        console.log('File saved to database:', dbFile);
        
        const ipfsFile: IPFSFile = {
          id: dbFile.id,
          filename: dbFile.filename,
          cid: dbFile.ipfs_cid || ipfsResult.cid,
          size: dbFile.file_size || ipfsResult.size,
          contentType: dbFile.content_type || ipfsResult.contentType,
          ipfsUrl: dbFile.ipfs_url || ipfsResult.url,
          uploadedAt: dbFile.created_at,
          userId: user.id,
          folderPath: dbFile.folder_path || folderPath
        };
        
        uploadedFiles.push(ipfsFile);
        
        setUploadProgress(50 + ((i + 1) / files.length) * 50); // Second 50% for database save
      }
      
      setUserFiles(prev => [...prev, ...uploadedFiles]);
      
      toast.success(`Successfully uploaded ${files.length} file(s) to IPFS!`);
      console.log('All files uploaded successfully:', uploadedFiles);
      
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
      console.log(`Downloading file from IPFS: ${cid}`);
      
      const blob = await IPFSService.retrieveFile(cid);
      if (!blob) {
        throw new Error('Failed to retrieve file from IPFS');
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${filename} successfully!`);
      
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const deleteFromIPFS = async (fileId: string, cid: string) => {
    try {
      console.log(`Deleting file: ${fileId} (CID: ${cid})`);
      
      // Remove from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', user?.id);
      
      if (dbError) {
        throw new Error('Failed to delete file record');
      }
      
      // Unpin from IPFS (in production, this would remove it from your pinning service)
      await IPFSService.unpinFile(cid);
      
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
    
    try {
      const { data: files, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user.id)
        .eq('storage_provider', 'ipfs')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      const ipfsFiles: IPFSFile[] = (files || []).map(file => ({
        id: file.id,
        filename: file.filename,
        cid: file.ipfs_cid || '',
        size: file.file_size || 0,
        contentType: file.content_type || 'application/octet-stream',
        ipfsUrl: file.ipfs_url || '',
        uploadedAt: file.created_at,
        userId: file.user_id,
        folderPath: file.folder_path
      }));
      
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
