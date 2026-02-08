/**
 * Metadata Privacy Service
 *
 * Handles encryption/decryption of file metadata for Supabase storage
 * while maintaining searchability via deterministic HMAC tokens.
 *
 * Key Features:
 * - Encrypts sensitive metadata (filename, folder, size, type) with AES-256-GCM
 * - Generates deterministic HMAC-SHA256 tokens for exact-match search
 * - Converts exact file sizes to approximate buckets for privacy
 * - Derives separate search key from encryption key via HKDF
 */

import { encryptMetadata, decryptMetadata } from './aesEncryptionService';
import { stringToBytes, bytesToHex } from './cryptoUtils';
import { SecurityLevel } from '@/types/blockdriveCrypto';
import type { Json } from '@/integrations/supabase/types';

// Size bucket thresholds in bytes
const SIZE_BUCKETS = {
  tiny: 10 * 1024,                    // < 10KB
  small: 1 * 1024 * 1024,             // < 1MB
  medium: 100 * 1024 * 1024,          // < 100MB
  large: 1 * 1024 * 1024 * 1024,      // < 1GB
  huge: Infinity                       // >= 1GB
} as const;

export type SizeBucket = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

/**
 * Private file metadata - the plaintext structure before encryption
 */
export interface PrivateFileMetadata {
  filename: string;
  folderPath: string;
  contentType: string;
  fileSize: number;
  customMetadata?: Record<string, unknown>;
}

/**
 * Encrypted metadata blob structure stored in Supabase
 */
export interface EncryptedMetadataBlob {
  version: 2;
  encryptedPayload: string;  // Base64-encoded AES-256-GCM ciphertext
  iv: string;                // Base64-encoded IV
  securityLevel: SecurityLevel;
}

/**
 * Result of encrypting file metadata
 */
export interface EncryptedMetadataResult {
  encryptedMetadata: Json;   // The encrypted blob to store
  filenameHash: string;      // HMAC for filename search
  folderPathHash: string;    // HMAC for folder listing
  sizeBucket: SizeBucket;    // Approximate size category
  metadataVersion: 2;
}

/**
 * Metadata Privacy Service
 *
 * Provides encryption and searchable token generation for file metadata.
 */
class MetadataPrivacyService {
  // HKDF salt and info strings for key derivation
  private readonly SEARCH_KEY_SALT = 'blockdrive-search-salt-v1';
  private readonly SEARCH_KEY_INFO = 'blockdrive-search-key-v1';

  /**
   * Derive a search key from the encryption key using HKDF
   *
   * The search key is used to generate deterministic HMAC tokens.
   * Using a separate key ensures that even if search tokens are compromised,
   * the encryption key remains secure.
   *
   * @param encryptionKey - The AES-256 encryption key
   * @returns HMAC key for generating search tokens
   */
  async deriveSearchKey(encryptionKey: CryptoKey): Promise<CryptoKey> {
    // Export the encryption key to get raw bytes
    const keyMaterial = await crypto.subtle.exportKey('raw', encryptionKey);

    // Import as HKDF key material
    const hkdfKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HKDF' },
      false,
      ['deriveKey']
    );

    // Derive HMAC key for search tokens
    return crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        salt: stringToBytes(this.SEARCH_KEY_SALT),
        info: stringToBytes(this.SEARCH_KEY_INFO),
        hash: 'SHA-256'
      },
      hkdfKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
  }

  /**
   * Generate a deterministic search token using HMAC-SHA256
   *
   * The token is deterministic for the same value and key, enabling
   * exact-match search without exposing the plaintext value.
   *
   * @param value - The value to tokenize (e.g., filename)
   * @param searchKey - HMAC key derived from encryption key
   * @returns Hex-encoded HMAC token
   */
  async generateSearchToken(value: string, searchKey: CryptoKey): Promise<string> {
    // Normalize the value for consistent matching
    const normalizedValue = value.toLowerCase().trim();
    const data = stringToBytes(normalizedValue);

    // Generate HMAC signature
    const signature = await crypto.subtle.sign('HMAC', searchKey, data);

    return bytesToHex(new Uint8Array(signature));
  }

  /**
   * Determine size bucket from exact file size
   *
   * Converts exact byte count to an approximate category for privacy.
   *
   * @param fileSize - Exact file size in bytes
   * @returns Size bucket category
   */
  getSizeBucket(fileSize: number): SizeBucket {
    if (fileSize < SIZE_BUCKETS.tiny) return 'tiny';
    if (fileSize < SIZE_BUCKETS.small) return 'small';
    if (fileSize < SIZE_BUCKETS.medium) return 'medium';
    if (fileSize < SIZE_BUCKETS.large) return 'large';
    return 'huge';
  }

  /**
   * Encrypt file metadata for storage in Supabase
   *
   * @param metadata - Plaintext metadata to encrypt
   * @param encryptionKey - AES-256 encryption key (from wallet)
   * @param securityLevel - Security level used for encryption
   * @returns Encrypted metadata and search tokens
   */
  async encryptFileMetadata(
    metadata: PrivateFileMetadata,
    encryptionKey: CryptoKey,
    securityLevel: SecurityLevel
  ): Promise<EncryptedMetadataResult> {
    // Derive search key for HMAC tokens
    const searchKey = await this.deriveSearchKey(encryptionKey);

    // Generate search tokens for filename and folder
    const filenameHash = await this.generateSearchToken(metadata.filename, searchKey);
    const folderPathHash = await this.generateSearchToken(metadata.folderPath, searchKey);

    // Encrypt the full metadata payload
    const { encrypted, iv } = await encryptMetadata(metadata, encryptionKey);

    // Build the encrypted metadata blob
    const encryptedBlob: EncryptedMetadataBlob = {
      version: 2,
      encryptedPayload: encrypted,
      iv: iv,
      securityLevel
    };

    return {
      encryptedMetadata: encryptedBlob as unknown as Json,
      filenameHash,
      folderPathHash,
      sizeBucket: this.getSizeBucket(metadata.fileSize),
      metadataVersion: 2
    };
  }

  /**
   * Decrypt file metadata from Supabase storage
   *
   * @param encryptedMetadata - The encrypted metadata blob from database
   * @param decryptionKey - AES-256 decryption key (from wallet)
   * @returns Decrypted plaintext metadata
   */
  async decryptFileMetadata(
    encryptedMetadata: Json,
    decryptionKey: CryptoKey
  ): Promise<PrivateFileMetadata> {
    const blob = encryptedMetadata as unknown as EncryptedMetadataBlob;

    if (blob.version !== 2) {
      throw new Error(`Unsupported metadata version: ${blob.version}`);
    }

    return decryptMetadata<PrivateFileMetadata>(
      blob.encryptedPayload,
      blob.iv,
      decryptionKey
    );
  }

  /**
   * Generate a search token for a filename query
   *
   * Use this to search for files by filename:
   * 1. Generate token from search query
   * 2. Query database for matching filename_hash
   *
   * @param searchQuery - The filename to search for
   * @param encryptionKey - User's encryption key
   * @returns HMAC token for database lookup
   */
  async generateFilenameSearchToken(
    searchQuery: string,
    encryptionKey: CryptoKey
  ): Promise<string> {
    const searchKey = await this.deriveSearchKey(encryptionKey);
    return this.generateSearchToken(searchQuery, searchKey);
  }

  /**
   * Generate a search token for a folder path query
   *
   * Use this to list files in a folder:
   * 1. Generate token from folder path
   * 2. Query database for matching folder_path_hash
   *
   * @param folderPath - The folder path to query
   * @param encryptionKey - User's encryption key
   * @returns HMAC token for database lookup
   */
  async generateFolderSearchToken(
    folderPath: string,
    encryptionKey: CryptoKey
  ): Promise<string> {
    const searchKey = await this.deriveSearchKey(encryptionKey);
    return this.generateSearchToken(folderPath, searchKey);
  }

  /**
   * Check if a file record has encrypted metadata (v2)
   *
   * @param fileRecord - Database record
   * @returns True if file uses encrypted metadata
   */
  isEncryptedMetadata(fileRecord: { metadata_version?: number | null }): boolean {
    return fileRecord.metadata_version === 2;
  }

  /**
   * Get file details, handling both v1 (plaintext) and v2 (encrypted) formats
   *
   * @param fileRecord - Database record
   * @param decryptionKey - User's decryption key (required for v2)
   * @returns Unified file details object
   */
  async getFileDetails(
    fileRecord: {
      filename: string;
      folder_path?: string | null;
      content_type?: string | null;
      file_size?: number | null;
      encrypted_metadata?: Json | null;
      metadata_version?: number | null;
    },
    decryptionKey?: CryptoKey
  ): Promise<{
    filename: string;
    folderPath: string;
    contentType: string;
    fileSize: number;
  }> {
    // Check if this is v2 encrypted metadata
    if (this.isEncryptedMetadata(fileRecord) && fileRecord.encrypted_metadata) {
      if (!decryptionKey) {
        throw new Error('Decryption key required for encrypted metadata');
      }

      const decrypted = await this.decryptFileMetadata(
        fileRecord.encrypted_metadata,
        decryptionKey
      );

      return {
        filename: decrypted.filename,
        folderPath: decrypted.folderPath,
        contentType: decrypted.contentType,
        fileSize: decrypted.fileSize
      };
    }

    // Legacy v1 plaintext metadata
    return {
      filename: fileRecord.filename,
      folderPath: fileRecord.folder_path || '/',
      contentType: fileRecord.content_type || 'application/octet-stream',
      fileSize: fileRecord.file_size || 0
    };
  }
}

// Export singleton instance
export const metadataPrivacyService = new MetadataPrivacyService();

// Export class for testing
export { MetadataPrivacyService };
