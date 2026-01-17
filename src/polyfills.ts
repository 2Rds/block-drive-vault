/**
 * Browser polyfills for Node.js modules
 * Required by Solana and other blockchain libraries
 */

import { Buffer } from 'buffer';

// Make Buffer globally available
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer;
}

// Also set on window for older code
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  window.Buffer = Buffer;
}

export {};
