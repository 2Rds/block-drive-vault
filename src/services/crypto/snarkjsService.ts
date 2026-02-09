/**
 * snarkjs Service
 * 
 * Provides Groth16 ZK proof generation and verification using snarkjs.
 * Handles loading circuit artifacts and generating/verifying proofs.
 */

// @ts-expect-error - snarkjs doesn't have proper types
import * as snarkjs from 'snarkjs';
import { sha256Bytes, bytesToHex, hexToBytes } from './cryptoUtils';

/**
 * Groth16 proof structure from snarkjs
 */
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: 'groth16';
  curve: 'bn128';
}

/**
 * Public signals for our circuit
 */
export interface CriticalBytesPublicSignals {
  commitment: string[]; // 256 bits as strings
}

/**
 * Full proof package for storage
 */
export interface Groth16ProofPackage {
  proof: Groth16Proof;
  publicSignals: string[];
  commitment: string;
  proofHash: string;
}

/**
 * Verification key structure
 */
interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

/**
 * Circuit artifacts paths
 */
const CIRCUIT_ARTIFACTS = {
  wasm: '/circuits/criticalBytesCommitment.wasm',
  zkey: '/circuits/criticalBytesCommitment_final.zkey',
  verificationKey: '/circuits/verification_key.json',
};

/**
 * Cache for loaded artifacts
 */
let cachedVerificationKey: VerificationKey | null = null;
let artifactsLoaded = false;

class SnarkjsService {
  /**
   * Check if real circuit artifacts are available
   * Verifies both the verification key and the WASM binary exist and are valid
   */
  async areCircuitsAvailable(): Promise<boolean> {
    try {
      // Check verification key exists
      const vkResponse = await fetch(CIRCUIT_ARTIFACTS.verificationKey, { method: 'HEAD' });
      if (!vkResponse.ok) return false;

      // Check WASM binary exists and has correct content type (not an HTML 404 page)
      const wasmResponse = await fetch(CIRCUIT_ARTIFACTS.wasm, { method: 'HEAD' });
      if (!wasmResponse.ok) return false;

      const contentType = wasmResponse.headers.get('content-type') || '';
      // Reject if server returned HTML (404 page) instead of WASM
      if (contentType.includes('text/html')) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load verification key from hosted artifacts
   */
  async loadVerificationKey(): Promise<VerificationKey> {
    if (cachedVerificationKey) {
      return cachedVerificationKey;
    }

    const response = await fetch(CIRCUIT_ARTIFACTS.verificationKey);
    if (!response.ok) {
      throw new Error('Failed to load verification key');
    }

    cachedVerificationKey = await response.json();
    return cachedVerificationKey!;
  }

  /**
   * Convert 16 bytes to 128 bits for circuit input
   */
  bytesToBits(bytes: Uint8Array): string[] {
    const bits: string[] = [];
    for (let i = 0; i < bytes.length; i++) {
      for (let j = 7; j >= 0; j--) {
        bits.push(((bytes[i] >> j) & 1).toString());
      }
    }
    return bits;
  }

  /**
   * Convert SHA-256 hash (hex string) to 256 bits for circuit input
   */
  hashToBits(hashHex: string): string[] {
    // Remove 0x prefix if present
    const cleanHex = hashHex.startsWith('0x') ? hashHex.slice(2) : hashHex;
    const bytes = hexToBytes(cleanHex);
    return this.bytesToBits(bytes);
  }

  /**
   * Generate a Groth16 proof that we know the preimage of a SHA-256 hash
   * 
   * @param criticalBytes - The 16 critical bytes (private input)
   * @param commitment - The SHA-256 commitment hex (public input)
   * @returns Groth16 proof package
   */
  async generateProof(
    criticalBytes: Uint8Array,
    commitment: string
  ): Promise<Groth16ProofPackage> {
    if (criticalBytes.length !== 16) {
      throw new Error('Critical bytes must be exactly 16 bytes');
    }

    // Verify commitment matches
    const computedHash = bytesToHex(await sha256Bytes(criticalBytes));
    const expectedHash = commitment.startsWith('0x') ? commitment.slice(2) : commitment;
    
    if (computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new Error('Critical bytes do not match commitment');
    }

    // Prepare circuit inputs
    const input = {
      criticalBytes: this.bytesToBits(criticalBytes),
      commitment: this.hashToBits(commitment),
    };

    try {
      // Generate the proof using snarkjs
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        CIRCUIT_ARTIFACTS.wasm,
        CIRCUIT_ARTIFACTS.zkey
      );

      // Create proof hash for integrity
      const proofJson = JSON.stringify({ proof, publicSignals });
      const proofHashBytes = await sha256Bytes(new TextEncoder().encode(proofJson));
      const proofHash = bytesToHex(proofHashBytes);

      artifactsLoaded = true;

      return {
        proof: proof as Groth16Proof,
        publicSignals,
        commitment,
        proofHash,
      };
    } catch (error) {
      console.error('[Snarkjs] Proof generation failed:', error);
      throw new Error(`Groth16 proof generation failed: ${error}`);
    }
  }

  /**
   * Verify a Groth16 proof
   * 
   * @param proofPackage - The proof package to verify
   * @returns true if valid, false otherwise
   */
  async verifyProof(proofPackage: Groth16ProofPackage): Promise<boolean> {
    try {
      const verificationKey = await this.loadVerificationKey();

      const isValid = await snarkjs.groth16.verify(
        verificationKey,
        proofPackage.publicSignals,
        proofPackage.proof
      );

      return isValid;
    } catch (error) {
      console.error('[Snarkjs] Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a simulated proof when circuit artifacts aren't available
   * This is a fallback for development/testing
   */
  async generateSimulatedProof(
    criticalBytes: Uint8Array,
    commitment: string
  ): Promise<Groth16ProofPackage> {
    console.warn('[Snarkjs] Using simulated proof - circuit artifacts not available');

    // Verify commitment matches
    const computedHash = bytesToHex(await sha256Bytes(criticalBytes));
    const expectedHash = commitment.startsWith('0x') ? commitment.slice(2) : commitment;
    
    if (computedHash.toLowerCase() !== expectedHash.toLowerCase()) {
      throw new Error('Critical bytes do not match commitment');
    }

    // Create simulated proof structure
    const simulatedProof: Groth16Proof = {
      pi_a: ['0x' + '1'.repeat(64), '0x' + '2'.repeat(64), '1'],
      pi_b: [
        ['0x' + '3'.repeat(64), '0x' + '4'.repeat(64)],
        ['0x' + '5'.repeat(64), '0x' + '6'.repeat(64)],
        ['1', '0']
      ],
      pi_c: ['0x' + '7'.repeat(64), '0x' + '8'.repeat(64), '1'],
      protocol: 'groth16',
      curve: 'bn128',
    };

    // Generate commitment bits as public signals
    const publicSignals = this.hashToBits(commitment);

    const proofJson = JSON.stringify({ proof: simulatedProof, publicSignals });
    const proofHashBytes = await sha256Bytes(new TextEncoder().encode(proofJson));
    const proofHash = bytesToHex(proofHashBytes);

    return {
      proof: simulatedProof,
      publicSignals,
      commitment,
      proofHash,
    };
  }

  /**
   * Smart proof generation - uses real circuits if available, simulated otherwise
   */
  async generateProofSmart(
    criticalBytes: Uint8Array,
    commitment: string
  ): Promise<Groth16ProofPackage> {
    const circuitsAvailable = await this.areCircuitsAvailable();
    
    if (circuitsAvailable) {
      return this.generateProof(criticalBytes, commitment);
    } else {
      return this.generateSimulatedProof(criticalBytes, commitment);
    }
  }

  /**
   * Check if we're using real circuits or simulated
   */
  isUsingRealCircuits(): boolean {
    return artifactsLoaded;
  }
}

export const snarkjsService = new SnarkjsService();
