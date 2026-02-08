/**
 * BlockDrive Cryptography Types
 * 
 * Defines types for the wallet-derived encryption system with
 * 3 security levels and critical byte separation.
 */

// Security levels for file encryption
export enum SecurityLevel {
  STANDARD = 1,   // Level 1 - Basic encryption
  SENSITIVE = 2,  // Level 2 - Enhanced protection
  MAXIMUM = 3     // Level 3 - Maximum security
}

// Messages to sign for deriving encryption keys
export const SECURITY_LEVEL_MESSAGES = {
  [SecurityLevel.STANDARD]: "BlockDrive Security Level One - Standard Protection",
  [SecurityLevel.SENSITIVE]: "BlockDrive Security Level Two - Sensitive Data Protection", 
  [SecurityLevel.MAXIMUM]: "BlockDrive Security Level Three - Maximum Security"
} as const;

// Derived encryption key with metadata
export interface DerivedEncryptionKey {
  level: SecurityLevel;
  key: CryptoKey;
  keyHash: string; // For verification, not storage
  derivedAt: number;
}

// Collection of all 3 derived keys
export interface WalletDerivedKeys {
  walletAddress: string;
  keys: Map<SecurityLevel, DerivedEncryptionKey>;
  initialized: boolean;
  lastRefreshed: number;
}

// Encrypted file with separated critical bytes
export interface EncryptedFileData {
  encryptedContent: Uint8Array;      // Encrypted file WITHOUT first 16 bytes
  criticalBytes: Uint8Array;         // First 16 bytes (stored separately)
  iv: Uint8Array;                    // Initialization vector for AES-GCM
  commitment: string;                // SHA-256 hash of critical bytes
  securityLevel: SecurityLevel;
  originalSize: number;
  encryptedSize: number;
  contentHash: string;               // Hash of original file for integrity
}

// File metadata to be encrypted and stored
export interface EncryptedFileMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: number;
  securityLevel: SecurityLevel;
  contentHash: string;
}

// Decryption result
export interface DecryptedFileResult {
  content: Uint8Array;
  metadata: EncryptedFileMetadata;
  verified: boolean;
  commitmentValid: boolean;
}

// ZK Proof placeholder (for future implementation)
export interface ZKProofData {
  proof: string;              // The zero-knowledge proof
  commitment: string;         // Public commitment
  encryptedCriticalBytes: string; // Critical bytes encrypted with wallet key
  proofCID?: string;          // IPFS CID of the proof
}

// File record for on-chain storage
export interface FileRecord {
  fileId: string;
  storageCID: string;         // CID of encrypted chunks
  proofCID: string;           // CID of ZK proof
  metadataCID: string;        // CID of encrypted metadata
  commitment: string;         // SHA-256 of critical bytes
  securityLevel: SecurityLevel;
  status: 'active' | 'deleted';
  createdAt: number;
  updatedAt: number;
}

// Signature request for key derivation
export interface SignatureRequest {
  message: string;
  level: SecurityLevel;
}

// Key derivation session state
export interface KeyDerivationSession {
  walletAddress: string;
  signatures: Map<SecurityLevel, Uint8Array>;
  keys: Map<SecurityLevel, CryptoKey>;
  isComplete: boolean;
  expiresAt: number;
}
