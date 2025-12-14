pragma circom 2.1.0;

// Note: circomlib must be installed: npm install circomlib
// The paths below work with standard npm installation
include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/**
 * CriticalBytesCommitment Circuit
 * 
 * Proves knowledge of 16 critical bytes that hash to a public SHA-256 commitment.
 * This is the core ZK circuit for BlockDrive's "programmed incompleteness" architecture.
 * 
 * The circuit:
 * 1. Takes 16 private bytes (128 bits) as input
 * 2. Computes SHA-256 hash of these bytes
 * 3. Constrains the hash to equal a public commitment
 * 4. Generates a Groth16 proof that can be verified without revealing the bytes
 * 
 * Public Inputs:
 *   - commitment[256]: The expected SHA-256 hash (256 bits)
 * 
 * Private Inputs:
 *   - criticalBytes[128]: The 16 critical bytes as bits (16 bytes * 8 bits = 128 bits)
 * 
 * Security Properties:
 *   - Zero-knowledge: Verifier learns nothing about criticalBytes except that they hash to commitment
 *   - Soundness: Prover cannot create valid proof without knowing preimage
 *   - Completeness: Honest prover with valid preimage can always create valid proof
 */
template CriticalBytesCommitment() {
    // Private input: 16 critical bytes represented as 128 bits
    signal input criticalBytes[128];
    
    // Public input: Expected SHA-256 commitment (256 bits)
    signal input commitment[256];
    
    // Binary constraint for each bit
    for (var i = 0; i < 128; i++) {
        criticalBytes[i] * (1 - criticalBytes[i]) === 0;
    }
    
    // Compute SHA-256 of the critical bytes
    // Sha256 component takes bits and outputs bits
    component sha256Hasher = Sha256(128);
    
    for (var i = 0; i < 128; i++) {
        sha256Hasher.in[i] <== criticalBytes[i];
    }
    
    // Constrain: computed hash must equal public commitment
    for (var i = 0; i < 256; i++) {
        sha256Hasher.out[i] === commitment[i];
    }
}

// Main component with public inputs declared
component main {public [commitment]} = CriticalBytesCommitment();
