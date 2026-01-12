import { supabase } from '@/integrations/supabase/client';
import { IPFSFile } from '@/types/ipfs';

export class FileDatabaseService {
  static async saveFileMetadata(
    clerkUserId: string,
    ipfsResult: any,
    originalFile: File,
    folderPath?: string
  ) {
    const fileData = {
      clerk_user_id: clerkUserId,
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
    
    try {
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
      
    } catch (error) {
      console.error('Critical error saving file metadata:', error);
      throw error;
    }
  }

  static async saveFile(fileData: {
    filename: string;
    file_size: number;
    content_type: string;
    clerk_user_id: string;
    folder_path?: string;
    storage_provider: string;
    ipfs_cid: string;
    ipfs_url: string;
    metadata?: any;
  }) {
    console.log('Saving file with hybrid storage data:', fileData);
    
    try {
      const { data: dbFile, error: dbError } = await supabase
        .from('files')
        .insert({
          ...fileData,
          file_path: `/${fileData.filename}`,
          is_encrypted: false,
          folder_path: fileData.folder_path || '/'
        })
        .select()
        .single();
      
      if (dbError) {
        console.error('Database error saving hybrid file:', dbError);
        throw new Error(`Failed to save file: ${dbError.message}`);
      }
      
      console.log('Hybrid file saved to database:', dbFile);
      return dbFile;
      
    } catch (error) {
      console.error('Error saving hybrid file:', error);
      throw error;
    }
  }

  static async loadUserFiles(clerkUserId: string): Promise<IPFSFile[]> {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
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
      userId: file.clerk_user_id,
      folderPath: file.folder_path,
      metadata: file.metadata as IPFSFile['metadata']
    }));
  }

  static async deleteFile(fileId: string, clerkUserId: string) {
    const { error: dbError } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)
      .eq('clerk_user_id', clerkUserId);
    
    if (dbError) {
      throw new Error('Failed to delete file record');
    }
  }
}
