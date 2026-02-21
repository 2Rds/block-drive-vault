# Changelog

All notable changes to BlockDrive Vault are documented here.

## [v2.3.0] - 2026-02-20

### Added
- **Direct Dynamic auth modal**: "Sign In" and "Start Free Trial" buttons now open Dynamic's auth flow directly via `setShowAuthFlow(true)` — eliminates extra page navigation
- **Post-auth redirect**: Automatically redirects users to `/dashboard` (returning) or `/onboarding` (new) after authenticating from any public page
- **Mandatory plan selection in onboarding**: New "Choose Plan" step after identity minting — users must subscribe (Stripe Checkout with 7-day trial) before accessing the platform
- **Subscription gate in ProtectedRoute**: Unsubscribed (`pending` tier) users are redirected to `/pricing` when accessing protected routes
- **PENDING subscription tier**: New tier with zero storage/bandwidth limits for users who haven't subscribed
- **Onboarding escape hatch**: "I'll choose a plan later" link redirects to `/pricing` for users who want to browse plans first

### Changed
- Default signup tier changed from `free_trial` to `pending` in `auto-signup-from-dynamic` and `link-wallet-to-email`
- CTA text updated: "No credit card required" → "7-day free trial, then $15/mo"
- Onboarding flow expanded to 5 steps: Sign Up → Username → Wallet → Identity → **Plan**
- "Continue with Trial Access" messaging removed from subscription cancel page

### Fixed
- **Post-auth redirect race condition**: Added `isExtrasLoaded` state flag — redirect now waits for NFT/ENS lookup to complete before choosing destination
- **Debug logging in production**: `logLevel: 'DEBUG'` in DynamicProvider now gated behind `import.meta.env.DEV`
- **ProtectedRoute loading flash**: Shows `LoadingScreen` while subscription status is loading (prevents brief redirect flicker)
- **useSubscriptionStatus error swallowing**: Error messages now preserved instead of silently cleared
- **Onboarding refresh skipping subscribe step**: Checks subscription status before marking onboarding complete
- **handleSelectPlan silent failures**: Added toast notifications for missing tier/pricing data and null user guard
- **useUploadPermissions loading state**: Now properly consumes `subLoading` from `useSubscriptionStatus`
- **link-wallet-to-email free_trial default**: Changed fallback tier from `free_trial` to `pending`

### Removed
- Dead `isFreeTrial` code and JSX branches in SubscriptionManager
- "Continue with Trial Access" button and messaging in SubscriptionCancel
- Free tier upload permissions — only `subscribed: true` users can upload

---

## [v2.2.0] - 2026-02-20

### Added
- **Dual-chain architecture**: EVM/Base support alongside Solana — wagmi + viem integration
- **Auto-debit USDC subscriptions**: ERC-20 approve + pull model on Base — users approve once, subscription processor pulls monthly
- **Subscription processor Worker**: Cloudflare Worker with daily cron trigger processes recurring USDC payments, handles retries and cancellations
- **ENS global identity**: `username.blockdrive.eth` via Namestone API — registered during onboarding alongside SNS `.sol` domain
- **Dual-chain USDC yield**: Aave V3 on Base (~3-5% APY) + Kamino KLEND on Solana (~4-6% APY) supply/withdraw
- **Multi-chain USDC balance hook**: `useCryptoBalance` fetches USDC across Base and Solana in parallel
- **Funding rails**: `FundWalletCard` dashboard CTA with per-chain balance display and Dynamic SDK funding widget
- **NFT token gate**: `hasBlockDriveNFT` flag in auth context with fallback warning for users lacking soulbound cNFT
- **Google Drive wallet backup status**: `WalletBackupStatus` settings component reads Dynamic SDK backup state
- **Yield dashboard**: Tabbed UI (Base/Solana) with supply/withdraw controls, combined stats, idle USDC suggestions
- **Yield summary card**: Compact dashboard card showing blended APY across both chains
- New hooks: `useCryptoSubscription`, `useCryptoBalance`, `useAaveYield`, `useKaminoYield`, `useEnsIdentity`
- New Edge Functions: `activate-crypto-subscription`, `register-ens-subdomain`
- DB migration: `crypto_subscriptions` billing columns + `crypto_payment_history` enhancements

### Changed
- `DynamicProvider.tsx`: Added `WagmiProvider` wrapper, Vault Noir CSS overrides, EVM network config, embedded wallet priority
- `DynamicAuthContext.tsx`: Added `ensName` and `hasBlockDriveNFT` to context, loads from Supabase on login
- `dynamic.ts` config: Expanded with Base chain, EVM treasury, USDC/Aave contract addresses, ENS parent domain
- `SecurityHeaders.tsx`: Added CSP domains for Base RPC, Banxa, Aave, Namestone, CDP
- `paymentService.ts`: Replaced crypto stub with real ERC-20 subscription flow, fixed `subscribe()` method types
- `useDynamicWallet.tsx`: Added `getEvmWalletClient()` method, fixed interface return types to `Promise<number | null>`
- `Onboarding.tsx`: Added dual-identity display (SNS + ENS), auto-registers ENS after SNS mint
- `DataDashboard.tsx`: Added YieldSummaryCard and FundWalletCard to dashboard layout
- `CryptoCheckoutModal.tsx`: Integrated real approval flow with multi-chain balance display

### Fixed
- `useCryptoSubscription`: Used `evmWallet` (not `primaryWallet`) for `getWalletClient()` — was targeting wrong chain
- `useCryptoSubscription`: Added `receipt.status` check after `waitForTransactionReceipt`
- `activate-crypto-subscription`: Added on-chain verification of approval tx via Base RPC (receipt + allowance check)
- Subscription processor: Added env var guards, wrapped per-subscription processing in try/catch (one failure no longer kills batch)
- `useCryptoBalance`: Added `useEffect` auto-fetch on mount, per-chain error logging instead of silent $0
- `useAaveYield`/`useKaminoYield`: Added `setError()` in refresh catch blocks, `chain: base` to writeContract calls
- `useKaminoYield`: API failure no longer resets `supplied` to 0 — keeps cached values
- Bare `catch {}` blocks replaced with `console.warn` logging in DynamicAuthContext and useEnsIdentity
- Fragile `document.querySelector` DOM queries replaced with `setShowDynamicUserProfile` SDK method
- Unhandled clipboard promises given `.catch()` handlers
- Edge Function upsert results now checked and logged
- ENS fire-and-forget promise in Onboarding given `.catch()` handler
- Shared `copied` boolean in FundWalletCard split to per-address tracking
- `PERIOD_MONTHS` constant simplified from 3 identical values to single `APPROVAL_MONTHS = 12`
- `ApprovalResult` converted to discriminated union type
- Worker `writeContract` given explicit `chain` and `account` params

---

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
