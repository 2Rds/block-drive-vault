
import { supabase } from '@/integrations/supabase/client';
import { IPFSFile } from '@/types/ipfs';

export class FileDatabaseService {
  static async saveFileMetadata(
    userId: string,
    walletId: string,
    ipfsResult: any,
    originalFile: File,
    folderPath?: string
  ) {
    const fileData = {
      user_id: userId,
      wallet_id: walletId,
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
        originalName: originalFile.name,
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
      throw new Error(`Failed to save ${originalFile.name} metadata: ${dbError.message}`);
    }
    
    console.log('File saved to database:', dbFile);
    return dbFile;
  }

  static async loadUserFiles(userId: string): Promise<IPFSFile[]> {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .eq('storage_provider', 'ipfs')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return (files || []).map(file => ({
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
  }

  static async deleteFile(fileId: string, userId: string) {
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);
    
    if (dbError) {
      throw new Error('Failed to delete file record');
    }
  }
}
