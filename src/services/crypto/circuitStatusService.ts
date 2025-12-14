/**
 * Circuit Status Service
 * 
 * Checks the availability and integrity of ZK circuit artifacts.
 */

import { snarkjsService } from './snarkjsService';

export interface CircuitStatus {
  available: boolean;
  wasmLoaded: boolean;
  zkeyLoaded: boolean;
  verificationKeyLoaded: boolean;
  circuitVersion: string;
  proofType: 'groth16' | 'simulated';
  lastChecked: number;
  error?: string;
}

const CIRCUIT_PATHS = {
  wasm: '/circuits/criticalBytesCommitment.wasm',
  zkey: '/circuits/criticalBytesCommitment_final.zkey',
  verificationKey: '/circuits/verification_key.json',
};

let cachedStatus: CircuitStatus | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 60000; // 1 minute

class CircuitStatusService {
  /**
   * Check if a file exists at the given path
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get the current circuit status
   */
  async getStatus(forceRefresh = false): Promise<CircuitStatus> {
    const now = Date.now();
    
    // Return cached status if still valid
    if (!forceRefresh && cachedStatus && (now - lastCheck) < CHECK_INTERVAL) {
      return cachedStatus;
    }

    try {
      // Check all circuit files
      const [wasmExists, zkeyExists, vkeyExists] = await Promise.all([
        this.fileExists(CIRCUIT_PATHS.wasm),
        this.fileExists(CIRCUIT_PATHS.zkey),
        this.fileExists(CIRCUIT_PATHS.verificationKey),
      ]);

      const allFilesExist = wasmExists && zkeyExists && vkeyExists;

      // Try to load verification key to check validity
      let vkeyValid = false;
      let circuitVersion = '1.0.0';
      
      if (vkeyExists) {
        try {
          const response = await fetch(CIRCUIT_PATHS.verificationKey);
          const vkey = await response.json();
          vkeyValid = vkey.protocol === 'groth16' && vkey.curve === 'bn128';
          circuitVersion = vkey._version || '1.0.0';
        } catch {
          vkeyValid = false;
        }
      }

      const status: CircuitStatus = {
        available: allFilesExist && vkeyValid,
        wasmLoaded: wasmExists,
        zkeyLoaded: zkeyExists,
        verificationKeyLoaded: vkeyExists && vkeyValid,
        circuitVersion,
        proofType: allFilesExist && vkeyValid ? 'groth16' : 'simulated',
        lastChecked: now,
      };

      cachedStatus = status;
      lastCheck = now;

      return status;
    } catch (error) {
      const status: CircuitStatus = {
        available: false,
        wasmLoaded: false,
        zkeyLoaded: false,
        verificationKeyLoaded: false,
        circuitVersion: 'unknown',
        proofType: 'simulated',
        lastChecked: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      cachedStatus = status;
      lastCheck = now;

      return status;
    }
  }

  /**
   * Get a user-friendly status message
   */
  async getStatusMessage(): Promise<string> {
    const status = await this.getStatus();
    
    if (status.available) {
      return `Groth16 circuits ready (v${status.circuitVersion})`;
    }
    
    const missing: string[] = [];
    if (!status.wasmLoaded) missing.push('WASM');
    if (!status.zkeyLoaded) missing.push('zkey');
    if (!status.verificationKeyLoaded) missing.push('verification key');
    
    if (missing.length > 0) {
      return `Using simulated proofs (missing: ${missing.join(', ')})`;
    }
    
    return 'Using simulated proofs';
  }

  /**
   * Check if real Groth16 proofs are available
   */
  async isGroth16Available(): Promise<boolean> {
    const status = await this.getStatus();
    return status.available;
  }

  /**
   * Get circuit file paths
   */
  getCircuitPaths() {
    return CIRCUIT_PATHS;
  }

  /**
   * Invalidate cached status
   */
  invalidateCache(): void {
    cachedStatus = null;
    lastCheck = 0;
  }
}

export const circuitStatusService = new CircuitStatusService();
