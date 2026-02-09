import { supabase } from '@/integrations/supabase/client';
import { IPFSFile } from '@/types/ipfs';
import type { Json } from '@/integrations/supabase/types';
import type { SizeBucket } from './crypto/metadataPrivacyService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Placeholder for encrypted filenames in v2 files
const ENCRYPTED_FILENAME_PLACEHOLDER = '[encrypted]';

// File visibility options for organization context
export type FileVisibility = 'team' | 'private';

/**
 * Privacy-enhanced file data for v2 uploads
 */
export interface PrivacyEnhancedFileData {
  // Required identifiers
  clerk_user_id: string;
  ipfs_cid: string;
  ipfs_url: string;
  storage_provider: string;

  // Privacy-enhanced metadata
  encrypted_metadata: Json;
  metadata_version: 2;
  filename_hash: string;
  folder_path_hash: string;
  size_bucket: SizeBucket;

  // Operational flags
  is_encrypted: boolean;

  // Organization support (optional)
  clerk_org_id?: string;
  visibility?: FileVisibility;
  owner_clerk_id?: string;
}

function toIPFSFile(file: any): IPFSFile {
  return {
    id: file.id,
    filename: file.filename,
    cid: file.ipfs_cid || '',
    size: file.file_size || 0,
    contentType: file.content_type || 'application/octet-stream',
    ipfsUrl: file.ipfs_url || '',
    uploadedAt: file.created_at,
    userId: file.clerk_user_id,
    folderPath: file.folder_path,
    metadata: file.metadata as IPFSFile['metadata'],
    visibility: file.visibility as FileVisibility | undefined,
    clerkOrgId: file.clerk_org_id,
    ownerClerkId: file.owner_clerk_id,
  };
}

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
    clerk_org_id?: string;
    visibility?: FileVisibility;
    owner_clerk_id?: string;
  }) {
    try {
      const insertData: Record<string, unknown> = {
        filename: fileData.filename,
        file_size: fileData.file_size,
        content_type: fileData.content_type,
        clerk_user_id: fileData.clerk_user_id,
        storage_provider: fileData.storage_provider,
        ipfs_cid: fileData.ipfs_cid,
        ipfs_url: fileData.ipfs_url,
        metadata: fileData.metadata,
        file_path: `/${fileData.filename}`,
        is_encrypted: false,
        folder_path: fileData.folder_path || '/'
      };

      if (fileData.clerk_org_id) {
        insertData.clerk_org_id = fileData.clerk_org_id;
      }
      if (fileData.visibility) {
        insertData.visibility = fileData.visibility;
      }
      if (fileData.owner_clerk_id) {
        insertData.owner_clerk_id = fileData.owner_clerk_id;
      }

      const { data: dbFile, error: dbError } = await supabase
        .from('files')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error saving hybrid file:', dbError);
        throw new Error(`Failed to save file: ${dbError.message}`);
      }

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

  // =============================================================================
  // Folder Methods
  // =============================================================================

  static async createFolder(
    client: SupabaseClient,
    clerkUserId: string,
    folderName: string,
    parentPath: string = '/',
    clerkOrgId?: string,
    visibility?: FileVisibility
  ): Promise<any> {
    const fullPath = `${parentPath}${parentPath.endsWith('/') ? '' : '/'}${folderName}`;
    const insertData: Record<string, unknown> = {
      clerk_user_id: clerkUserId,
      filename: folderName,
      file_path: fullPath,
      folder_path: parentPath,
      content_type: 'application/x-directory',
      file_size: 0,
      ipfs_cid: '',
      ipfs_url: '',
      storage_provider: 'local',
      is_encrypted: false,
    };
    if (clerkOrgId) insertData.clerk_org_id = clerkOrgId;
    if (visibility) insertData.visibility = visibility;

    const { data, error } = await client
      .from('files')
      .insert(insertData)
      .select()
      .single();
    if (error) throw new Error(`Failed to create folder: ${error.message}`);
    return data;
  }

  static async deleteFolder(
    client: SupabaseClient,
    folderId: string,
    clerkUserId: string
  ): Promise<void> {
    const { error } = await client
      .from('files')
      .delete()
      .eq('id', folderId)
      .eq('clerk_user_id', clerkUserId)
      .eq('content_type', 'application/x-directory');
    if (error) throw new Error(`Failed to delete folder: ${error.message}`);
  }

  static async moveFileToFolder(
    client: SupabaseClient,
    fileId: string,
    clerkUserId: string,
    targetFolderPath: string,
    filename: string
  ): Promise<void> {
    const filePath = `${targetFolderPath}${targetFolderPath.endsWith('/') ? '' : '/'}${filename}`;
    const { error } = await client
      .from('files')
      .update({ folder_path: targetFolderPath, file_path: filePath })
      .eq('id', fileId)
      .eq('clerk_user_id', clerkUserId);
    if (error) throw new Error(`Failed to move file: ${error.message}`);
  }

  // =============================================================================
  // Organization-Aware File Methods
  // =============================================================================

  /**
   * Load team files visible to all organization members
   * Requires authenticated Supabase client with org_id in JWT
   */
  static async loadTeamFiles(
    client: SupabaseClient,
    clerkOrgId: string
  ): Promise<IPFSFile[]> {
    const { data: files, error } = await client
      .from('files')
      .select('*')
      .eq('clerk_org_id', clerkOrgId)
      .eq('visibility', 'team')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading team files:', error);
      throw error;
    }

    return (files || []).map(toIPFSFile);
  }

  /**
   * Load user's private files within an organization
   * Only visible to the file owner
   */
  static async loadMyOrgFiles(
    client: SupabaseClient,
    clerkOrgId: string,
    clerkUserId: string
  ): Promise<IPFSFile[]> {
    const { data: files, error } = await client
      .from('files')
      .select('*')
      .eq('clerk_org_id', clerkOrgId)
      .eq('visibility', 'private')
      .eq('clerk_user_id', clerkUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading my org files:', error);
      throw error;
    }

    return (files || []).map(toIPFSFile);
  }

  /**
   * Load user's personal files (no organization)
   */
  static async loadPersonalFiles(
    client: SupabaseClient,
    clerkUserId: string
  ): Promise<IPFSFile[]> {
    const { data: files, error } = await client
      .from('files')
      .select('*')
      .is('clerk_org_id', null)
      .eq('clerk_user_id', clerkUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading personal files:', error);
      throw error;
    }

    return (files || []).map(toIPFSFile);
  }

  /**
   * Update file visibility (move between team/private)
   */
  static async updateFileVisibility(
    client: SupabaseClient,
    fileId: string,
    visibility: FileVisibility
  ): Promise<void> {
    const { error } = await client
      .from('files')
      .update({ visibility })
      .eq('id', fileId);

    if (error) {
      console.error('Error updating file visibility:', error);
      throw new Error(`Failed to update file visibility: ${error.message}`);
    }
  }

  /**
   * Move a personal file to an organization
   */
  static async moveFileToOrg(
    client: SupabaseClient,
    fileId: string,
    clerkOrgId: string,
    visibility: FileVisibility = 'team'
  ): Promise<void> {
    const { error } = await client
      .from('files')
      .update({
        clerk_org_id: clerkOrgId,
        visibility
      })
      .eq('id', fileId);

    if (error) {
      console.error('Error moving file to org:', error);
      throw new Error(`Failed to move file to organization: ${error.message}`);
    }
  }

  // =============================================================================
  // Phase 4: Privacy-Enhanced Methods
  // =============================================================================

  /**
   * Save a file with privacy-enhanced encrypted metadata (v2)
   *
   * Use this for new uploads to ensure metadata privacy.
   * The filename is stored as '[encrypted]' placeholder for UI compatibility.
   */
  static async saveFileWithPrivacy(fileData: PrivacyEnhancedFileData) {
    try {
      const insertData: Record<string, unknown> = {
        clerk_user_id: fileData.clerk_user_id,

        // Plaintext fields (required for operation)
        ipfs_cid: fileData.ipfs_cid,
        ipfs_url: fileData.ipfs_url,
        storage_provider: fileData.storage_provider,
        is_encrypted: fileData.is_encrypted,

        // Privacy-enhanced metadata
        encrypted_metadata: fileData.encrypted_metadata,
        metadata_version: fileData.metadata_version,
        filename_hash: fileData.filename_hash,
        folder_path_hash: fileData.folder_path_hash,
        size_bucket: fileData.size_bucket,

        // Legacy fields set to placeholders for v2 files
        filename: ENCRYPTED_FILENAME_PLACEHOLDER,
        file_path: null,
        content_type: null,
        file_size: null,
        folder_path: null,
        metadata: null
      };

      if (fileData.clerk_org_id) {
        insertData.clerk_org_id = fileData.clerk_org_id;
      }
      if (fileData.visibility) {
        insertData.visibility = fileData.visibility;
      }
      if (fileData.owner_clerk_id) {
        insertData.owner_clerk_id = fileData.owner_clerk_id;
      }

      const { data: dbFile, error: dbError } = await supabase
        .from('files')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error saving privacy-enhanced file:', dbError);
        throw new Error(`Failed to save file: ${dbError.message}`);
      }

      return dbFile;

    } catch (error) {
      console.error('Error saving privacy-enhanced file:', error);
      throw error;
    }
  }

  /**
   * Search for files by filename hash (exact match only)
   *
   * @param clerkUserId - User ID
   * @param filenameHash - HMAC token of the filename to search for
   * @returns Matching files (may need decryption for full metadata)
   */
  static async searchByFilename(
    clerkUserId: string,
    filenameHash: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('filename_hash', filenameHash);

    if (error) {
      console.error('Error searching by filename:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * List files in a folder by folder path hash
   *
   * @param clerkUserId - User ID
   * @param folderPathHash - HMAC token of the folder path
   * @returns Files in the folder (may need decryption for full metadata)
   */
  static async listFolder(
    clerkUserId: string,
    folderPathHash: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .eq('folder_path_hash', folderPathHash)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing folder:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all files for a user (both v1 and v2)
   *
   * Returns raw database records. Use metadataPrivacyService.getFileDetails()
   * to decrypt v2 metadata for display.
   */
  static async getAllFilesRaw(clerkUserId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading files:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Update a file's encrypted metadata (for migration from v1 to v2)
   *
   * @param fileId - File UUID
   * @param encryptedData - New encrypted metadata
   */
  static async migrateToEncryptedMetadata(
    fileId: string,
    encryptedData: {
      encrypted_metadata: Json;
      filename_hash: string;
      folder_path_hash: string;
      size_bucket: SizeBucket;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('files')
      .update({
        encrypted_metadata: encryptedData.encrypted_metadata,
        metadata_version: 2,
        filename_hash: encryptedData.filename_hash,
        folder_path_hash: encryptedData.folder_path_hash,
        size_bucket: encryptedData.size_bucket
      })
      .eq('id', fileId);

    if (error) {
      console.error('Error migrating file metadata:', error);
      throw new Error(`Failed to migrate file ${fileId}: ${error.message}`);
    }
  }
}
