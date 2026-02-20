# Changelog

All notable changes to BlockDrive Vault are documented here.

## [v2.1.0] - 2026-02-19

### Added
- Client-side wallet signature key derivation (WS1) — `signatureKeyDerivation.ts` derives 3 independent AES-256-GCM keys from a single wallet signature via HKDF-SHA256
- 64-byte Ed25519 signature validation with all-zero guard in `deriveKeysFromSignature`
- In-flight promise deduplication (mutex) on `initializeKeys` — prevents concurrent signing races
- Contextual error messages on `crypto.subtle.importKey` and `deriveKey` failures
- `hasAttempted` guard in `CryptoSetupModal` to prevent infinite auto-retry loops
- `InitResult` return type (`{ success, error }`) from `initializeKeys` — eliminates stale closure bugs

### Removed
- `supabase/functions/derive-key-material/` edge function — server-side key derivation eliminated
- `sessionStorage` signature caching — root HKDF secret no longer persisted; module-level singleton is sufficient for SPA navigation
- Old security-question types from `blockdriveCrypto.ts`

### Changed
- `useWalletCrypto` hook rewritten: module-level singleton key store with `useSyncExternalStore`, auto-restore removed (re-sign on page reload)
- `CryptoSetupModal` simplified: auto-derives on open, shows real error messages, manual retry button
- `keyDerivationService.ts` validates security level and wraps crypto ops with contextual errors
- User-facing strings updated from "security question" to wallet signing language in 4 components

### Fixed
- Stale `state.error` closure in `CryptoSetupModal.deriveKeys` — now reads error from `InitResult`
- Infinite retry loop when signing fails — `hasAttempted` flag prevents effect re-trigger
- `getKey()` logs warning before re-signing on session expiry
- ARCHITECTURE.md: fixed HKDF table (was `answer_hash`), heading (was "Security Question Based"), directory tree
- SECURITY.md: fixed HKDF salt/info parameters in code example
- DocsContent: fixed card title, legacy edge function label

---

## [v2.0.0] - 2026-02-19

### Breaking Changes
- **Auth provider migration**: Replaced Clerk with Dynamic SDK (`@dynamic-labs/sdk-react-core`)
- **Wallet provider migration**: Replaced Crossmint embedded wallets with Dynamic Fireblocks TSS-MPC wallets
- **Webhook format change**: Webhooks now use Dynamic HMAC-SHA256 (`x-dynamic-signature-256`) instead of Svix signatures
- **Environment variables changed**: `VITE_CLERK_PUBLISHABLE_KEY` → `VITE_DYNAMIC_ENVIRONMENT_ID`, all `CROSSMINT_*` vars removed
- **DB column renames**: `clerk_user_id` → `auth_provider_id` in subscribers table, `crossmint_wallet_address` → `wallet_address` in profiles

### Added
- Dynamic SDK integration with Fireblocks TSS-MPC embedded wallets (Solana + EVM)
- `DynamicProvider.tsx` — DynamicContextProvider with passkey, email, and social auth
- `DynamicAuthContext.tsx` — auth context: userId, user, isSignedIn, supabase (Dynamic JWT), walletAddress
- `useDynamicWallet.tsx` — wallet hook with `signMessage()` support (critical for WS1 key derivation)
- `DynamicSupabaseClient.ts` — Supabase client with Dynamic JWT injection
- `DynamicSignIn.tsx` / `DynamicSignUp.tsx` — sign-in/sign-up pages using Dynamic auth modal
- `ConnectButton.tsx` / `ProtectedRoute.tsx` / `UserButton.tsx` — auth UI components for Dynamic
- `useOrganizationCompat.tsx` — compatibility shim for org hooks (Supabase-backed orgs in WS6)
- Dynamic webhook handler with HMAC-SHA256 constant-time signature verification
- Provider-agnostic `TransactionSigner` interface (replaces Crossmint-specific signer)
- `PaymentProvider` type `'crypto'` (replaces `'crossmint'`)

### Removed
- `@clerk/clerk-react` package and all Clerk imports (52+ files modified)
- `ClerkAuthContext.tsx`, `StandaloneAuthProvider.tsx`, `ClerkConnectButton.tsx`, `ClerkProtectedRoute.tsx`
- `ClerkSupabaseClient.ts`, `clerkTheme.ts`, `SignIn.tsx`, `SignUp.tsx` (old Clerk pages)
- `CrossmintProvider.tsx`, `useCrossmintWallet.tsx`, `crossmint.ts` config
- `services/crossmint/` directory, `workers/crossmint-proxy/` directory
- `supabase/functions/create-crossmint-wallet/`, `sync-crossmint-wallet/`, `_shared/crossmint.ts`
- `supabase/functions/clerk-webhook/` (replaced by Dynamic webhook)
- `derive-key-material` edge function (server-side key derivation vulnerability — replaced by client-side in WS1)
- `/webhooks/clerk` backward-compat route
- Dead backward-compat exports: `useClerkAuth`, `useCrossmintWallet`, `ClerkConnectButton`, `ClerkProtectedRoute`

### Changed
- All `useClerkAuth()` calls → `useDynamicAuth()` (same interface)
- All `useCrossmintWallet()` calls → `useDynamicWallet()` (same interface + `signMessage`)
- Supabase JWT verification updated for Dynamic JWT format (`sub` claim = Dynamic user ID)
- Storage providers use `window.__dynamic_session` instead of `__clerk_session`
- Webhook handler uses `x-dynamic-signature-256` HMAC-SHA256 instead of Svix `svix-signature`
- CSP headers updated: removed clerk.dev/crossmint.com domains, added Dynamic SDK domains
- 16 Supabase Edge Functions updated to verify Dynamic JWT instead of Clerk JWT
- `create-checkout` edge function: provider-agnostic user ID handling
- DB migration: `wallets` table (renamed from `crossmint_wallets`), `auth_provider_id` column

### Fixed
- Zero stale Clerk/Crossmint references remain in `src/`, `supabase/functions/`, or `workers/api-gateway/src/`
- DocsContent section ID now matches DocsSidebar (`dynamic-auth-integration`)
- Agent coding assistant config updated to reference Dynamic SDK

## [v1.2.0] - 2026-02-19

### Added
- Python Recovery SDK (`recovery-sdk/`) — full implementation with HKDF key derivation, AES-256-GCM decryption, ZK proof verification, IPFS/R2 multi-provider downloads, and optional Solana on-chain verification
- Require sign-in on each new browser visit (session security hardening)
- Frontend migration to Solana native minting via Worker API gateway

### Fixed
- Replace all blockdrive.io references with blockdrive.co
- Node polyfills, WebAuthn localhost support, R2 proof metadata, Worker CORS
- Lazy R2 provider initialization — resolve "Provider r2 not found"
- Fall back to Filebase for ZK proofs when R2 is unavailable
- Detailed DB insert error logging and Clerk JWT diagnostics
- Stop setting clerk_org_id on uploads, show personal files in org mode
- Use Clerk-authenticated Supabase client for file reads/deletes
- Remove remaining vaultExists references in IPFSFiles
- Remove vault initialization gate blocking file uploads
- Migrate to Bubblegum V2 tree + polling-based TX confirmation
- Use computed remaining count in rate limit response

### Changed
- Removed non-existent features from docs, added Coming Soon badge to Recovery SDK section

## [v1.1.0] - 2026-02-16

### Added
- Per-org MPL-Core NFT collections — each organization gets a branded collection (~0.003 SOL)
- `organization.deleted` webhook handler with full on-chain + DB cleanup (10-step deletion)
- `POST /solana/update-org-collection` endpoint for org admins to update collection metadata
- Defense-in-depth Edge Function fallback for org deletion (DB-only cleanup)
- Intercom messenger SDK integration with JWT identity verification
- `/release` slash command for automated version bumping, doc updates, and git tagging
- Pre-push hook reminder for running `/release` before pushing

### Changed
- Org member cNFTs now mint into per-org collections instead of the global collection
- `user.deleted` and `organization.deleted` webhooks return 207 Multi-Status on partial failure
- Webhook handlers derive `success` from `errors.length` instead of hardcoding `true`
- `SupabaseClient` now has a `delete()` method

### Fixed
- FK constraints changed from RESTRICT to ON DELETE SET NULL for resilient org deletion
- Table-wide username UNIQUE constraint replaced with conditional indexes (individual vs per-org)
- Missing DB columns added: `domain_type`, `parent_domain`, `organization_id`, `org_nft_mint`, `org_collection_address`, `org_username`, `org_subdomain_nft_id`
- Catch blocks now log full error detail instead of discarding it
- Collection address DB write is now a hard failure (prevents silent data loss)

## [v1.0.0] - 2026-02-09

### Added
- Multi-PDA Sharding architecture (1000+ files per user)
- Security question-based key derivation (HKDF-SHA256, 3 security levels)
- End-to-end encrypted file upload/download with Groth16 ZK proofs
- Persistent folder management with drag-and-drop
- Crossmint gas-sponsored Solana embedded wallets
- Clerk authentication with Organizations (invite codes + email domain verification)
- SNS subdomain registration (`username.blockdrive.sol`)
- Bubblegum V2 soulbound cNFT membership tokens
- Metadata Privacy v2 (encrypted metadata with HMAC search tokens)
- Stripe Sync Engine with real-time data mirroring
- Cloudflare Worker API Gateway with rate limiting, CORS, and security headers
- Python Recovery SDK for independent file recovery
- 41 Supabase Edge Functions
- 5-step org-aware onboarding flow
