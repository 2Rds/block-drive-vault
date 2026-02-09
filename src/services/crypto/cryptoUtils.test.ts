import {
  stringToBytes,
  bytesToString,
  bytesToHex,
  hexToBytes,
  bytesToBase64,
  base64ToBytes,
  sha256,
  sha256Bytes,
  randomBytes,
  concatBytes,
  bytesEqual,
  secureWipe,
} from './cryptoUtils';

describe('stringToBytes / bytesToString', () => {
  it('round-trips ASCII', () => {
    const original = 'hello world';
    expect(bytesToString(stringToBytes(original))).toBe(original);
  });

  it('round-trips unicode', () => {
    const original = 'hello 🌍';
    expect(bytesToString(stringToBytes(original))).toBe(original);
  });

  it('handles empty string', () => {
    expect(bytesToString(stringToBytes(''))).toBe('');
  });
});

describe('bytesToHex / hexToBytes', () => {
  it('round-trips', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0xab, 0x12]);
    expect(hexToBytes(bytesToHex(bytes))).toEqual(bytes);
  });

  it('produces known output', () => {
    expect(bytesToHex(new Uint8Array([0, 1, 255]))).toBe('0001ff');
  });

  it('handles empty array', () => {
    expect(bytesToHex(new Uint8Array([]))).toBe('');
    expect(hexToBytes('')).toEqual(new Uint8Array([]));
  });
});

describe('bytesToBase64 / base64ToBytes', () => {
  it('round-trips', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it('produces known output', () => {
    // "Hello" in base64 is "SGVsbG8="
    expect(bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]))).toBe('SGVsbG8=');
  });

  it('handles empty array', () => {
    expect(bytesToBase64(new Uint8Array([]))).toBe('');
  });
});

describe('sha256 / sha256Bytes', () => {
  it('produces correct hash for known input', async () => {
    // SHA-256 of empty string
    const hash = await sha256(new Uint8Array([]));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('sha256Bytes returns 32 bytes', async () => {
    const hashBytes = await sha256Bytes(stringToBytes('test'));
    expect(hashBytes.length).toBe(32);
  });

  it('sha256 and sha256Bytes agree', async () => {
    const input = stringToBytes('blockdrive');
    const hexHash = await sha256(input);
    const bytesHash = await sha256Bytes(input);
    expect(bytesToHex(bytesHash)).toBe(hexHash);
  });
});

describe('randomBytes', () => {
  it('returns correct length', () => {
    expect(randomBytes(16).length).toBe(16);
    expect(randomBytes(32).length).toBe(32);
    expect(randomBytes(0).length).toBe(0);
  });

  it('two calls produce different output', () => {
    const a = randomBytes(32);
    const b = randomBytes(32);
    // Extremely unlikely to be equal
    expect(bytesEqual(a, b)).toBe(false);
  });
});

describe('concatBytes', () => {
  it('concatenates multiple arrays', () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const c = new Uint8Array([5]);
    expect(concatBytes(a, b, c)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it('handles empty arrays', () => {
    expect(concatBytes()).toEqual(new Uint8Array([]));
    expect(concatBytes(new Uint8Array([]))).toEqual(new Uint8Array([]));
  });

  it('handles single array', () => {
    const a = new Uint8Array([1, 2, 3]);
    expect(concatBytes(a)).toEqual(a);
  });
});

describe('bytesEqual', () => {
  it('returns true for equal arrays', () => {
    expect(bytesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
  });

  it('returns false for unequal arrays', () => {
    expect(bytesEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(bytesEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('returns true for empty arrays', () => {
    expect(bytesEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true);
  });
});

describe('secureWipe', () => {
  it('zeros out the array', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    secureWipe(data);
    expect(data.every((b) => b === 0)).toBe(true);
  });

  it('handles empty array', () => {
    const data = new Uint8Array([]);
    secureWipe(data);
    expect(data.length).toBe(0);
  });
});
