/**
 * WebAuthn Biometric Authentication Types
 *
 * Types for the WebAuthn-based vault unlock system that replaces
 * security questions with fingerprint/face biometric verification.
 */

/** Stored WebAuthn credential metadata (from server) */
export interface WebAuthnCredential {
  id: string;
  credentialId: string;
  deviceName: string;
  deviceType: 'platform' | 'cross-platform';
  createdAt: number;
  lastUsedAt: number;
}

/** Result of a successful WebAuthn authentication */
export interface WebAuthnVerificationResult {
  success: boolean;
  assertionToken: string;
  credentialId: string;
}

/** QR flow session info returned by the challenge endpoint */
export interface QRSession {
  sessionId: string;
  challengeId: string;
  qrUrl: string;
  expiresAt: number;
}

/** Realtime message broadcast when mobile completes auth */
export interface QRAuthCompletedPayload {
  event: 'auth_completed';
  assertionToken: string;
}

/** Email fallback send result */
export interface EmailFallbackResult {
  success: boolean;
  email: string;
}

/** Flow steps for CryptoSetupModal */
export type CryptoFlowStep =
  | 'loading'
  | 'setup-biometric'
  | 'verify-biometric'
  | 'verify-qr'
  | 'verify-email-sent'
  | 'verify-email-token'
  | 'deriving'
  | 'legacy-setup'
  | 'legacy-verify';
