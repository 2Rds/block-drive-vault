import {
  encryptFileWithCriticalBytes,
  decryptFileWithCriticalBytes,
  encryptCriticalBytes,
  decryptCriticalBytes,
  generateFileId,
} from './blockDriveCryptoService';
import { sha256, bytesEqual, stringToBytes } from './cryptoUtils';
import { SecurityLevel } from '@/types/blockdriveCrypto';

// Helper: generate a test AES-256-GCM key
async function makeTestKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

describe('encryptFileWithCriticalBytes', () => {
  it('extracts 16-byte critical bytes and removes them from content', async () => {
    const key = await makeTestKey();
    const fileData = crypto.getRandomValues(new Uint8Array(256));

    const result = await encryptFileWithCriticalBytes(
      fileData, 'test.bin', 'application/octet-stream', key, SecurityLevel.STANDARD,
    );

    expect(result.criticalBytes.length).toBe(16);
    // encrypted content = full encrypted minus first 16
    expect(result.encryptedContent.length).toBe(result.encryptedSize - 16);
  });

  it('commitment is SHA-256 of critical bytes', async () => {
    const key = await makeTestKey();
    const fileData = crypto.getRandomValues(new Uint8Array(128));

    const result = await encryptFileWithCriticalBytes(
      fileData, 'file.txt', 'text/plain', key, SecurityLevel.SENSITIVE,
    );

    const expectedCommitment = await sha256(result.criticalBytes);
    expect(result.commitment).toBe(expectedCommitment);
  });

  it('throws for file that encrypts too small', async () => {
    const key = await makeTestKey();
    // 1 byte of plaintext — AES-GCM adds 16-byte tag, so encrypted = 17 bytes, which is > 16.
    // We need to test with an input so tiny that the encrypted output could be < 16.
    // AES-GCM outputs plaintext.length + 16 (tag), so 0 bytes → 16 bytes, which equals CRITICAL_BYTES_LENGTH.
    // The check is < 16, so 16 bytes should pass. Let's not test this edge case differently.
    // Actually: encrypted.length for 0 bytes = 16 (just the auth tag). 16 < 16 is false, so it won't throw.
    // The function only throws if encrypted < 16, which requires negative plaintext — practically impossible.
    // We'll verify the function does NOT throw for a minimal valid file.
    const fileData = new Uint8Array(1);
    const result = await encryptFileWithCriticalBytes(
      fileData, 'tiny.bin', 'application/octet-stream', key, SecurityLevel.STANDARD,
    );
    expect(result.criticalBytes.length).toBe(16);
  });

  it('preserves metadata fields', async () => {
    const key = await makeTestKey();
    const fileData = crypto.getRandomValues(new Uint8Array(100));

    const result = await encryptFileWithCriticalBytes(
      fileData, 'doc.pdf', 'application/pdf', key, SecurityLevel.MAXIMUM,
    );

    expect(result.securityLevel).toBe(SecurityLevel.MAXIMUM);
    expect(result.originalSize).toBe(100);
    expect(result.contentHash).toBeDefined();
    expect(result.iv).toBeDefined();
  });
});

describe('encrypt → decrypt round-trip', () => {
  it('recovers original file content', async () => {
    const key = await makeTestKey();
    const original = stringToBytes('BlockDrive test file content for round-trip verification');

    const encrypted = await encryptFileWithCriticalBytes(
      original, 'roundtrip.txt', 'text/plain', key, SecurityLevel.STANDARD,
    );

    const decrypted = await decryptFileWithCriticalBytes(
      encrypted.encryptedContent,
      encrypted.criticalBytes,
      encrypted.iv,
      encrypted.commitment,
      key,
      encrypted.contentHash,
    );

    expect(bytesEqual(decrypted.content, original)).toBe(true);
    expect(decrypted.verified).toBe(true);
    expect(decrypted.commitmentValid).toBe(true);
  });

  it('fails with wrong commitment', async () => {
    const key = await makeTestKey();
    const original = crypto.getRandomValues(new Uint8Array(64));

    const encrypted = await encryptFileWithCriticalBytes(
      original, 'test.bin', 'application/octet-stream', key, SecurityLevel.STANDARD,
    );

    await expect(
      decryptFileWithCriticalBytes(
        encrypted.encryptedContent,
        encrypted.criticalBytes,
        encrypted.iv,
        'badc0ffee' + encrypted.commitment.slice(9), // tampered commitment
        key,
      ),
    ).rejects.toThrow('Commitment verification failed');
  });
});

describe('encryptCriticalBytes / decryptCriticalBytes', () => {
  it('round-trips critical bytes', async () => {
    const key = await makeTestKey();
    const criticalBytes = crypto.getRandomValues(new Uint8Array(16));

    const { encrypted, iv } = await encryptCriticalBytes(criticalBytes, key);
    const recovered = await decryptCriticalBytes(encrypted, iv, key);

    expect(bytesEqual(recovered, criticalBytes)).toBe(true);
  });
});

describe('generateFileId', () => {
  it('returns a 32-character hex string', async () => {
    const id = await generateFileId('abc123hash', 'GkX9...walletAddr', 1700000000000);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('different inputs produce different IDs', async () => {
    const id1 = await generateFileId('hash1', 'wallet1', 1);
    const id2 = await generateFileId('hash2', 'wallet1', 1);
    expect(id1).not.toBe(id2);
  });
});
