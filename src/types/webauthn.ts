/**
 * WebAuthn Biometric Authentication Types
 *
 * Types for the WebAuthn-based vault unlock system that replaces
 * security questions with fingerprint/face biometric verification.
 */

/** Result of a successful WebAuthn authentication */
export interface WebAuthnVerificationResult {
  success: boolean;
  assertionToken: string;
  credentialId: string;
}

/** Realtime message broadcast when mobile completes auth */
export interface QRAuthCompletedPayload {
  event: 'auth_completed';
  assertionToken: string;
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
