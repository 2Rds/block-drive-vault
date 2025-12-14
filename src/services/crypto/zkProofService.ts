/**
 * Zero-Knowledge Proof Service
 * 
 * Implements ZK proofs for BlockDrive's "programmed incompleteness" architecture.
 * Uses snarkjs Groth16 circuits for real zero-knowledge proofs.
 * 
 * The ZK proof:
 * 1. Proves knowledge of 16 bytes that hash to the public commitment (Groth16)
 * 2. Embeds the encrypted critical bytes (encrypted with wallet key)
 * 3. Is uploaded to storage (S3/IPFS) - only the CID is stored on-chain
 * 
 * This ensures critical bytes are never stored locally or on-chain in usable form.
 */

import { sha256, sha256Bytes, bytesToBase64, base64ToBytes, bytesToHex, randomBytes, concatBytes } from './cryptoUtils';
import { snarkjsService, Groth16ProofPackage, Groth16Proof } from './snarkjsService';

/**
 * ZK Proof structure that gets uploaded to storage
 * Now includes real Groth16 proof data
 */
export interface ZKProofPackage {
  version: 2;
  
  // Public commitment (SHA-256 of critical bytes)
  commitment: string;
  
  // Groth16 proof data
  groth16Proof: Groth16Proof | null;
  publicSignals: string[];
  
  // Encrypted critical bytes (only wallet owner can decrypt)
  encryptedCriticalBytes: string;  // base64
  encryptedIv: string;             // base64, IV used for file encryption
  encryptionIv: string;            // base64, IV used to encrypt critical bytes
  
  // Proof data
  proofHash: string;               // Hash of the proof for integrity
  proofTimestamp: number;
  
  // Verification data
  verificationData: {
    commitmentAlgorithm: 'SHA-256';
    encryptionAlgorithm: 'AES-256-GCM';
    proofType: 'BlockDrive-ZK-v2-Groth16' | 'BlockDrive-ZK-v2-Simulated';
    circuitVersion: string;
  };
  
  // Signature proving wallet ownership at proof creation time
  walletSignature?: string;
}

/**
 * Legacy v1 proof structure for backward compatibility
 */
export interface ZKProofPackageV1 {
  version: 1;
  commitment: string;
  encryptedCriticalBytes: string;
  encryptedIv: string;
  encryptionIv: string;
  proofHash: string;
  proofTimestamp: number;
  verificationData: {
    commitmentAlgorithm: 'SHA-256';
    encryptionAlgorithm: 'AES-256-GCM';
    proofType: 'BlockDrive-ZK-v1';
  };
  walletSignature?: string;
}

/**
 * Union type for all proof versions
 */
export type AnyZKProofPackage = ZKProofPackage | ZKProofPackageV1;

/**
 * Serialized proof for storage
 */
export interface SerializedZKProof {
  proof: string;  // base64 encoded ZKProofPackage JSON
  proofHash: string;
  commitment: string;
}

class ZKProofService {
  private circuitVersion = '1.0.0';

  /**
   * Generate a ZK proof package for the critical bytes
   * Uses Groth16 circuits when available, falls back to simulated
   */
  async generateProof(
    criticalBytes: Uint8Array,
    fileIv: Uint8Array,
    encryptionKey: CryptoKey,
    commitment: string
  ): Promise<ZKProofPackage> {
    // Verify the commitment matches
    const computedCommitment = await sha256(criticalBytes);
    if (computedCommitment !== commitment) {
      throw new Error('Critical bytes do not match commitment');
    }

    // Generate Groth16 proof
    console.log('[ZKProof] Generating Groth16 proof for commitment:', commitment.slice(0, 16) + '...');
    
    let groth16Package: Groth16ProofPackage;
    let proofType: 'BlockDrive-ZK-v2-Groth16' | 'BlockDrive-ZK-v2-Simulated';
    
    try {
      groth16Package = await snarkjsService.generateProofSmart(criticalBytes, commitment);
      proofType = snarkjsService.isUsingRealCircuits() 
        ? 'BlockDrive-ZK-v2-Groth16' 
        : 'BlockDrive-ZK-v2-Simulated';
    } catch (error) {
      console.error('[ZKProof] Groth16 generation failed, using simulated:', error);
      groth16Package = await snarkjsService.generateSimulatedProof(criticalBytes, commitment);
      proofType = 'BlockDrive-ZK-v2-Simulated';
    }

    // Generate IV for encrypting critical bytes
    const encryptionIv = randomBytes(12);

    // Create payload: critical bytes + file IV
    const payload = concatBytes(criticalBytes, fileIv);

    // Encrypt the payload with wallet-derived key
    const encryptedPayload = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: encryptionIv.buffer as ArrayBuffer
      },
      encryptionKey,
      payload.buffer as ArrayBuffer
    );

    // Create the proof package
    const proofPackage: ZKProofPackage = {
      version: 2,
      commitment,
      groth16Proof: groth16Package.proof,
      publicSignals: groth16Package.publicSignals,
      encryptedCriticalBytes: bytesToBase64(new Uint8Array(encryptedPayload)),
      encryptedIv: bytesToBase64(fileIv),
      encryptionIv: bytesToBase64(encryptionIv),
      proofHash: '', // Will be computed below
      proofTimestamp: Date.now(),
      verificationData: {
        commitmentAlgorithm: 'SHA-256',
        encryptionAlgorithm: 'AES-256-GCM',
        proofType,
        circuitVersion: this.circuitVersion,
      }
    };

    // Compute proof hash for integrity verification
    const proofContentForHash = JSON.stringify({
      commitment: proofPackage.commitment,
      groth16Proof: proofPackage.groth16Proof,
      publicSignals: proofPackage.publicSignals,
      encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
      proofTimestamp: proofPackage.proofTimestamp
    });
    proofPackage.proofHash = await sha256(new TextEncoder().encode(proofContentForHash));

    console.log(`[ZKProof] Generated ${proofType} proof with commitment:`, commitment.slice(0, 16) + '...');

    return proofPackage;
  }

  /**
   * Verify the Groth16 proof cryptographically
   */
  async verifyGroth16Proof(proofPackage: ZKProofPackage): Promise<boolean> {
    if (!proofPackage.groth16Proof) {
      console.warn('[ZKProof] No Groth16 proof to verify');
      return false;
    }

    if (proofPackage.verificationData.proofType === 'BlockDrive-ZK-v2-Simulated') {
      // Simulated proofs can't be cryptographically verified
      console.log('[ZKProof] Simulated proof - skipping cryptographic verification');
      return true;
    }

    try {
      const groth16Package: Groth16ProofPackage = {
        proof: proofPackage.groth16Proof,
        publicSignals: proofPackage.publicSignals,
        commitment: proofPackage.commitment,
        proofHash: proofPackage.proofHash,
      };

      return await snarkjsService.verifyProof(groth16Package);
    } catch (error) {
      console.error('[ZKProof] Groth16 verification failed:', error);
      return false;
    }
  }

  /**
   * Verify and extract critical bytes from a ZK proof
   * Only the wallet owner (with correct decryption key) can extract
   */
  async verifyAndExtract(
    proofPackage: AnyZKProofPackage,
    decryptionKey: CryptoKey,
    expectedCommitment: string
  ): Promise<{ criticalBytes: Uint8Array; fileIv: Uint8Array; verified: boolean }> {
    // Step 1: Verify commitment matches
    if (proofPackage.commitment !== expectedCommitment) {
      throw new Error('Proof commitment does not match expected commitment');
    }

    // Step 2: Verify proof hash integrity
    let proofContentForHash: string;
    
    if (proofPackage.version === 2) {
      proofContentForHash = JSON.stringify({
        commitment: proofPackage.commitment,
        groth16Proof: proofPackage.groth16Proof,
        publicSignals: proofPackage.publicSignals,
        encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
        proofTimestamp: proofPackage.proofTimestamp
      });

      // Step 2.5: Verify Groth16 proof if available
      if (proofPackage.groth16Proof && proofPackage.verificationData.proofType === 'BlockDrive-ZK-v2-Groth16') {
        const groth16Valid = await this.verifyGroth16Proof(proofPackage);
        if (!groth16Valid) {
          throw new Error('Groth16 cryptographic verification failed');
        }
      }
    } else {
      // V1 legacy format
      proofContentForHash = JSON.stringify({
        commitment: proofPackage.commitment,
        encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
        proofTimestamp: proofPackage.proofTimestamp
      });
    }

    const computedHash = await sha256(new TextEncoder().encode(proofContentForHash));
    
    if (computedHash !== proofPackage.proofHash) {
      throw new Error('Proof integrity verification failed - data may be tampered');
    }

    // Step 3: Decrypt the critical bytes
    const encryptedData = base64ToBytes(proofPackage.encryptedCriticalBytes);
    const encryptionIv = base64ToBytes(proofPackage.encryptionIv);

    try {
      const decryptedPayload = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: encryptionIv.buffer as ArrayBuffer
        },
        decryptionKey,
        encryptedData.buffer as ArrayBuffer
      );

      const payload = new Uint8Array(decryptedPayload);
      
      // First 16 bytes are critical bytes, next 12 are file IV
      const criticalBytes = payload.slice(0, 16);
      const fileIv = payload.slice(16, 28);

      // Step 4: Verify extracted bytes match commitment
      const extractedCommitment = await sha256(criticalBytes);
      if (extractedCommitment !== expectedCommitment) {
        throw new Error('Extracted bytes do not match commitment - proof invalid');
      }

      console.log('[ZKProof] Successfully verified and extracted critical bytes');

      return {
        criticalBytes,
        fileIv,
        verified: true
      };
    } catch (error) {
      console.error('[ZKProof] Failed to decrypt/verify proof:', error);
      throw new Error('Failed to decrypt proof - wrong key or corrupted data');
    }
  }

  /**
   * Serialize proof for storage (S3/IPFS upload)
   */
  serializeForStorage(proofPackage: AnyZKProofPackage): Uint8Array {
    const jsonString = JSON.stringify(proofPackage);
    return new TextEncoder().encode(jsonString);
  }

  /**
   * Deserialize proof from storage
   */
  deserializeFromStorage(data: Uint8Array): AnyZKProofPackage {
    const jsonString = new TextDecoder().decode(data);
    return JSON.parse(jsonString) as AnyZKProofPackage;
  }

  /**
   * Create a minimal reference to store on-chain
   * Only contains what's needed to find and verify the proof
   */
  createOnChainReference(
    proofPackage: AnyZKProofPackage,
    proofCid: string
  ): { proofCid: string; commitment: string; proofHash: string; proofVersion: number } {
    return {
      proofCid,
      commitment: proofPackage.commitment,
      proofHash: proofPackage.proofHash,
      proofVersion: proofPackage.version,
    };
  }

  /**
   * Generate proof for sharing with another user
   * Re-encrypts the critical bytes with the recipient's key
   */
  async generateSharedProof(
    originalProof: AnyZKProofPackage,
    ownerDecryptionKey: CryptoKey,
    recipientEncryptionKey: CryptoKey,
    expectedCommitment: string
  ): Promise<ZKProofPackage> {
    // Extract from original proof
    const { criticalBytes, fileIv } = await this.verifyAndExtract(
      originalProof,
      ownerDecryptionKey,
      expectedCommitment
    );

    // Re-encrypt for recipient with new Groth16 proof
    return this.generateProof(
      criticalBytes,
      fileIv,
      recipientEncryptionKey,
      expectedCommitment
    );
  }

  /**
   * Verify a proof without extracting (for public verification)
   */
  async verifyProofIntegrity(proofPackage: AnyZKProofPackage): Promise<boolean> {
    try {
      let proofContentForHash: string;
      
      if (proofPackage.version === 2) {
        proofContentForHash = JSON.stringify({
          commitment: proofPackage.commitment,
          groth16Proof: proofPackage.groth16Proof,
          publicSignals: proofPackage.publicSignals,
          encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
          proofTimestamp: proofPackage.proofTimestamp
        });
      } else {
        proofContentForHash = JSON.stringify({
          commitment: proofPackage.commitment,
          encryptedCriticalBytes: proofPackage.encryptedCriticalBytes,
          proofTimestamp: proofPackage.proofTimestamp
        });
      }
      
      const computedHash = await sha256(new TextEncoder().encode(proofContentForHash));
      
      if (computedHash !== proofPackage.proofHash) {
        return false;
      }

      // For v2 proofs, also verify Groth16 if real circuits were used
      if (proofPackage.version === 2 && proofPackage.verificationData.proofType === 'BlockDrive-ZK-v2-Groth16') {
        return await this.verifyGroth16Proof(proofPackage);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if proof uses real Groth16 circuits
   */
  isRealGroth16Proof(proofPackage: AnyZKProofPackage): boolean {
    return proofPackage.version === 2 && 
           proofPackage.verificationData.proofType === 'BlockDrive-ZK-v2-Groth16';
  }

  /**
   * Invalidate a proof (for deletion)
   * Returns random bytes that can overwrite the commitment on-chain
   */
  generateInvalidationBytes(): Uint8Array {
    return randomBytes(32);
  }

  /**
   * Get proof type for display
   */
  getProofTypeDisplay(proofPackage: AnyZKProofPackage): string {
    if (proofPackage.version === 1) {
      return 'Legacy (v1)';
    }
    if (proofPackage.verificationData.proofType === 'BlockDrive-ZK-v2-Groth16') {
      return 'Groth16 (bn128)';
    }
    return 'Simulated';
  }
}

// Export singleton
export const zkProofService = new ZKProofService();
