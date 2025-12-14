pragma circom 2.1.0;

include "circomlib/circuits/sha256/sha256.circom";
include "circomlib/circuits/bitify.circom";

/**
 * CriticalBytesCommitment Circuit
 * 
 * Proves knowledge of 16 critical bytes that hash to a public SHA-256 commitment.
 * This is the core ZK circuit for BlockDrive's "programmed incompleteness" architecture.
 * 
 * Public Inputs:
 *   - commitment[256]: The expected SHA-256 hash (256 bits)
 * 
 * Private Inputs:
 *   - criticalBytes[128]: The 16 critical bytes as bits (16 bytes * 8 bits = 128 bits)
 * 
 * Constraints:
 *   - SHA256(criticalBytes) === commitment
 */
template CriticalBytesCommitment() {
    // Private input: 16 critical bytes represented as 128 bits
    signal input criticalBytes[128];
    
    // Public input: Expected SHA-256 commitment (256 bits)
    signal input commitment[256];
    
    // Compute SHA-256 of the critical bytes
    // Note: sha256 expects bits, so we're already in the right format
    component sha256Hasher = Sha256(128);
    
    for (var i = 0; i < 128; i++) {
        sha256Hasher.in[i] <== criticalBytes[i];
        
        // Ensure each bit is binary (0 or 1)
        criticalBytes[i] * (1 - criticalBytes[i]) === 0;
    }
    
    // Constrain: computed hash must equal public commitment
    for (var i = 0; i < 256; i++) {
        sha256Hasher.out[i] === commitment[i];
    }
}

component main {public [commitment]} = CriticalBytesCommitment();
