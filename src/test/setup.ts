import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';
import { Buffer } from 'node:buffer';

// jsdom creates a separate JS realm, so `instanceof ArrayBuffer` can fail
// for ArrayBuffers crossing realm boundaries. We normalise every BufferSource
// into a Node Buffer (which Node's webcrypto always accepts).
function toNodeBuffer(input: BufferSource): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  // Handles both same-realm and cross-realm ArrayBuffer
  return Buffer.from(input as ArrayBuffer);
}

function normaliseAlgorithm(algorithm: any): any {
  if (algorithm && typeof algorithm === 'object' && !(algorithm instanceof String)) {
    const out: any = { ...algorithm };
    if (out.iv) out.iv = toNodeBuffer(out.iv);
    if (out.additionalData) out.additionalData = toNodeBuffer(out.additionalData);
    if (out.counter) out.counter = toNodeBuffer(out.counter);
    if (out.salt) out.salt = toNodeBuffer(out.salt);
    if (out.info) out.info = toNodeBuffer(out.info);
    if (out.label) out.label = toNodeBuffer(out.label);
    return out;
  }
  return algorithm;
}

const realSubtle = webcrypto.subtle;

const patchedSubtle = new Proxy(realSubtle, {
  get(target, prop, receiver) {
    if (prop === 'digest') {
      return async (algorithm: any, data: BufferSource) =>
        target.digest(algorithm, toNodeBuffer(data));
    }
    if (prop === 'encrypt') {
      return async (algorithm: any, key: CryptoKey, data: BufferSource) =>
        target.encrypt(normaliseAlgorithm(algorithm), key as any, toNodeBuffer(data));
    }
    if (prop === 'decrypt') {
      return async (algorithm: any, key: CryptoKey, data: BufferSource) =>
        target.decrypt(normaliseAlgorithm(algorithm), key as any, toNodeBuffer(data));
    }
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(target);
    }
    return value;
  },
});

const patchedCrypto = {
  getRandomValues: <T extends ArrayBufferView>(array: T): T => webcrypto.getRandomValues(array as any) as any,
  randomUUID: () => webcrypto.randomUUID(),
  subtle: patchedSubtle,
};

Object.defineProperty(globalThis, 'crypto', {
  value: patchedCrypto,
  writable: true,
  configurable: true,
});
