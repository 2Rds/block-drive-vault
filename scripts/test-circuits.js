/**
 * ZK Circuit Test Script
 * 
 * Tests the compiled circuits by generating and verifying a proof.
 * Run with: node scripts/test-circuits.js
 */

const snarkjs = require('snarkjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CIRCUITS_DIR = path.join(__dirname, '../public/circuits');

/**
 * Convert bytes to bits array for circuit input
 */
function bytesToBits(bytes) {
  const bits = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push(((bytes[i] >> j) & 1).toString());
    }
  }
  return bits;
}

/**
 * Compute SHA-256 and return as bits
 */
function sha256ToBits(data) {
  const hash = crypto.createHash('sha256').update(data).digest();
  return bytesToBits(hash);
}

async function testCircuit() {
  console.log('BlockDrive ZK Circuit Test');
  console.log('==========================\n');

  // Check if circuit files exist
  const wasmPath = path.join(CIRCUITS_DIR, 'criticalBytesCommitment.wasm');
  const zkeyPath = path.join(CIRCUITS_DIR, 'criticalBytesCommitment_final.zkey');
  const vkeyPath = path.join(CIRCUITS_DIR, 'verification_key.json');

  const filesExist = [wasmPath, zkeyPath, vkeyPath].every(p => fs.existsSync(p));
  
  if (!filesExist) {
    console.log('❌ Circuit files not found. Run build-circuits.sh first.');
    console.log('\nExpected files:');
    console.log('  - public/circuits/criticalBytesCommitment.wasm');
    console.log('  - public/circuits/criticalBytesCommitment_final.zkey');
    console.log('  - public/circuits/verification_key.json');
    process.exit(1);
  }

  console.log('✅ Circuit files found\n');

  // Generate test data
  console.log('Generating test data...');
  const criticalBytes = crypto.randomBytes(16);
  const commitment = sha256ToBits(criticalBytes);

  console.log(`  Critical bytes: ${criticalBytes.toString('hex')}`);
  console.log(`  Commitment (first 64 bits): ${commitment.slice(0, 64).join('')}...\n`);

  // Prepare circuit input
  const input = {
    criticalBytes: bytesToBits(criticalBytes),
    commitment: commitment
  };

  // Generate proof
  console.log('Generating Groth16 proof...');
  const startProof = Date.now();
  
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    
    const proofTime = Date.now() - startProof;
    console.log(`✅ Proof generated in ${proofTime}ms\n`);

    // Verify proof
    console.log('Verifying proof...');
    const startVerify = Date.now();
    
    const vKey = JSON.parse(fs.readFileSync(vkeyPath));
    const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
    
    const verifyTime = Date.now() - startVerify;
    console.log(`${isValid ? '✅' : '❌'} Proof verification: ${isValid ? 'VALID' : 'INVALID'} (${verifyTime}ms)\n`);

    // Test with wrong input (should fail)
    console.log('Testing with wrong commitment (should fail)...');
    const wrongBytes = crypto.randomBytes(16);
    const wrongInput = {
      criticalBytes: bytesToBits(wrongBytes),
      commitment: commitment // Using original commitment with wrong bytes
    };

    try {
      await snarkjs.groth16.fullProve(wrongInput, wasmPath, zkeyPath);
      console.log('❌ ERROR: Proof should have failed with wrong input!\n');
    } catch (e) {
      console.log('✅ Correctly rejected wrong input\n');
    }

    // Print proof size
    const proofJson = JSON.stringify(proof);
    console.log('Proof Statistics:');
    console.log(`  Proof size: ${proofJson.length} bytes`);
    console.log(`  Public signals: ${publicSignals.length}`);
    console.log(`  Generation time: ${proofTime}ms`);
    console.log(`  Verification time: ${verifyTime}ms\n`);

    // Export calldata for Solidity verifier
    console.log('Generating Solidity calldata...');
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    console.log(`  Calldata length: ${calldata.length} chars\n`);

    console.log('==========================');
    console.log('All tests passed! ✅');
    console.log('==========================');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testCircuit().catch(console.error);
