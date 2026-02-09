/**
 * Web Crypto API polyfill for test environment.
 * Re-exports the setup from test/setup.ts — import this mock
 * in tests that rely on crypto.subtle being available.
 *
 * The actual polyfill is applied globally in setup.ts via Node's
 * built-in webcrypto module, so this file is mainly a documentation
 * marker for tests that depend on it.
 */

// The polyfill is already applied globally in src/test/setup.ts.
// This file exists so test files can explicitly declare the dependency:
//   import '@/test/mocks/crypto';
export {};
