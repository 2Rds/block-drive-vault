# Changelog

All notable changes to BlockDrive Vault are documented here.

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
