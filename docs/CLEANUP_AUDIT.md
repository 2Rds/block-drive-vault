# BlockDrive Codebase Cleanup Audit

> **Generated**: January 2026
> **Updated**: January 17, 2026

## Completed Cleanup

| Item | Action |
|------|--------|
| 50+ `tmpclaude-*` temp files | Deleted |
| `nul` empty file | Deleted |
| `.gitignore` | Updated |
| Gas credits remnants (5 files) | Removed - replaced with Alchemy gas sponsorship |
| Unused auth/wallet services (10 files) | Removed - Clerk + Alchemy replaces legacy auth |

**Gas Credits Cleanup Details:**
- `src/types/nftMembership.ts` - Removed `GasCreditsAccount`, `gasCredits` field
- `src/services/nftMembershipService.ts` - Removed PDA derivation, deduction methods
- `src/components/membership/MembershipBadge.tsx` - Removed gas credits display
- `src/hooks/useNFTMembership.tsx` - Removed MVP fallback gas credits
- `src/pages/Membership.tsx` - Replaced gas credits card with bandwidth display

**Auth/Wallet Service Cleanup Details:**
Deprecated stubs (not imported anywhere):
- `src/services/authService.ts` - Deprecated stub
- `src/services/supabaseAuthService.ts` - Deprecated stub
- `src/services/walletService.ts` - Deprecated stub
- `src/services/walletDatabaseService.ts` - Deprecated stub
- `src/services/walletSecurityService.ts` - Deprecated stub
- `src/services/authenticationService.ts` - Unused legacy wallet auth

Legacy external wallet flow (replaced by Alchemy embedded wallets):
- `src/services/phantomWalletService.ts` - Unused Phantom adapter
- `src/services/solflareWalletService.ts` - Unused Solflare adapter
- `src/hooks/useWalletConnection.tsx` - Unused hook
- `src/components/WalletConnector.tsx` - Unused component

---

## Flagged for Review

### 1. TODO/FIXME Comments (LOW - Verified)
**Original estimate: 52 markers**
**Actual count: 3 markers** - All are legitimate Phase 2 implementation markers:
- `src/config/nftCollection.ts:17` - Update after NFT collection created (Phase 2)
- `src/components/dashboard/MembershipCard.tsx:85` - Bandwidth tracking (Phase 2)
- `supabase/functions/mca-verify/index.ts:439` - Basenames verification (Phase 2)

### 2. Root Images (MEDIUM)
4 PNGs (~3.5MB) in project root - move to `docs/images/` or `public/`.

### 3. Storage Providers (LOW)
S3 provider may be redundant with R2 as primary.

### 4. Security Fix Docs (LOW)
`SECURITY_FIX_*.md` files - archive if fixes applied.

---

## Priority: ~~Gas Credits~~ > ~~TODOs~~ > ~~Redundancy~~ > Organization

**Completed**:
- Gas credits removal (5 files cleaned)
- TODO/FIXME audit (3 legitimate markers found, no action needed)
- Service redundancy cleanup (10 unused files removed)

**Remaining**: Root images, storage providers, security docs (LOW priority)
