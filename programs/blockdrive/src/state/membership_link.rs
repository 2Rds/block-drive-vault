use anchor_lang::prelude::*;

/// Maximum length for SNS domain string
/// Typical SNS domains are under 50 characters, but we allow 64 for flexibility
pub const MAX_SNS_DOMAIN_LENGTH: usize = 64;

/// MembershipLink PDA - Links a wallet address to its SNS domain and membership NFT
/// This creates a unified identity system for BlockDrive members
///
/// Seeds: ["membership_link", wallet_pubkey]
///
/// # Security Considerations
/// - The wallet field is immutable after creation (identity anchor)
/// - Only the wallet owner can modify their membership link
/// - SNS domain changes should be validated off-chain before update
/// - NFT mint changes require the old NFT to be burned first
#[account]
pub struct MembershipLink {
    /// Bump seed for PDA derivation (saves compute on re-derivation)
    pub bump: u8,

    /// The wallet address this membership is linked to
    /// This is the primary identity anchor and cannot be changed
    pub wallet: Pubkey,

    /// The SNS (Solana Naming Service) domain associated with this wallet
    /// e.g., "alice.sol" stored without the .sol suffix for efficiency
    /// Empty string if no domain is linked
    pub sns_domain: String,

    /// The mint address of the soulbound membership NFT
    /// This NFT uses Token-2022 with Transfer Hook to enforce non-transferability
    pub nft_mint: Pubkey,

    /// Unix timestamp when this membership link was created
    pub created_at: i64,

    /// Unix timestamp of the last update to this record
    pub updated_at: i64,

    /// Whether this membership link is currently active
    /// Inactive links preserve history but don't grant access
    pub is_active: bool,

    /// Reserved space for future upgrades
    /// Can be used for: membership tier, referral info, custom metadata hash, etc.
    pub reserved: [u8; 64],
}

impl MembershipLink {
    /// Account size calculation for rent-exempt allocation
    ///
    /// Layout:
    /// - 8 bytes: Anchor discriminator
    /// - 1 byte: bump
    /// - 32 bytes: wallet pubkey
    /// - 4 + MAX_SNS_DOMAIN_LENGTH bytes: sns_domain (String prefix + content)
    /// - 32 bytes: nft_mint pubkey
    /// - 8 bytes: created_at timestamp
    /// - 8 bytes: updated_at timestamp
    /// - 1 byte: is_active boolean
    /// - 64 bytes: reserved
    pub const SIZE: usize = 8 +      // discriminator
        1 +                           // bump
        32 +                          // wallet
        4 + MAX_SNS_DOMAIN_LENGTH +   // sns_domain (4-byte length prefix + string data)
        32 +                          // nft_mint
        8 +                           // created_at
        8 +                           // updated_at
        1 +                           // is_active
        64;                           // reserved

    /// Seed prefix for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"membership_link";

    /// Check if this membership link is currently active
    #[inline]
    pub fn is_membership_active(&self) -> bool {
        self.is_active
    }

    /// Check if this link has an SNS domain associated
    #[inline]
    pub fn has_sns_domain(&self) -> bool {
        !self.sns_domain.is_empty()
    }

    /// Check if this link has an NFT mint associated
    /// (Pubkey::default() indicates no NFT)
    #[inline]
    pub fn has_nft_mint(&self) -> bool {
        self.nft_mint != Pubkey::default()
    }

    /// Validate that the SNS domain meets requirements
    /// Returns true if valid, false otherwise
    pub fn validate_sns_domain(domain: &str) -> bool {
        // Domain must not exceed max length
        if domain.len() > MAX_SNS_DOMAIN_LENGTH {
            return false;
        }

        // If not empty, must contain only valid characters
        if !domain.is_empty() {
            // SNS domains should be alphanumeric with optional hyphens
            // No leading/trailing hyphens, no consecutive hyphens
            let valid_chars = domain.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
            let no_edge_hyphens = !domain.starts_with('-') && !domain.ends_with('-');
            let no_consecutive_hyphens = !domain.contains("--");

            return valid_chars && no_edge_hyphens && no_consecutive_hyphens;
        }

        true // Empty domain is valid (means no domain linked)
    }

    /// Update the membership link with new values
    /// Returns error if validation fails
    pub fn update(
        &mut self,
        sns_domain: Option<String>,
        nft_mint: Option<Pubkey>,
        timestamp: i64,
    ) -> Result<()> {
        if let Some(domain) = sns_domain {
            require!(
                Self::validate_sns_domain(&domain),
                MembershipLinkError::InvalidSnsDomain
            );
            self.sns_domain = domain;
        }

        if let Some(mint) = nft_mint {
            self.nft_mint = mint;
        }

        self.updated_at = timestamp;

        Ok(())
    }

    /// Deactivate this membership link
    /// This preserves the record but marks it as inactive
    pub fn deactivate(&mut self, timestamp: i64) {
        self.is_active = false;
        self.updated_at = timestamp;
    }

    /// Reactivate a deactivated membership link
    pub fn reactivate(&mut self, timestamp: i64) {
        self.is_active = true;
        self.updated_at = timestamp;
    }
}

impl Default for MembershipLink {
    fn default() -> Self {
        Self {
            bump: 0,
            wallet: Pubkey::default(),
            sns_domain: String::new(),
            nft_mint: Pubkey::default(),
            created_at: 0,
            updated_at: 0,
            is_active: false,
            reserved: [0u8; 64],
        }
    }
}

/// Errors specific to MembershipLink operations
#[error_code]
pub enum MembershipLinkError {
    #[msg("SNS domain exceeds maximum length or contains invalid characters")]
    InvalidSnsDomain,

    #[msg("Membership link already exists for this wallet")]
    MembershipLinkExists,

    #[msg("Membership link not found")]
    MembershipLinkNotFound,

    #[msg("Membership link is not active")]
    MembershipLinkInactive,

    #[msg("Membership link is already active")]
    MembershipLinkAlreadyActive,

    #[msg("Invalid NFT mint address")]
    InvalidNftMint,

    #[msg("NFT mint mismatch - expected different mint")]
    NftMintMismatch,

    #[msg("Wallet mismatch - unauthorized operation")]
    WalletMismatch,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_sns_domain() {
        // Valid domains
        assert!(MembershipLink::validate_sns_domain("alice"));
        assert!(MembershipLink::validate_sns_domain("alice-wallet"));
        assert!(MembershipLink::validate_sns_domain("alice123"));
        assert!(MembershipLink::validate_sns_domain("")); // Empty is valid

        // Invalid domains
        assert!(!MembershipLink::validate_sns_domain("-alice"));
        assert!(!MembershipLink::validate_sns_domain("alice-"));
        assert!(!MembershipLink::validate_sns_domain("alice--bob"));
        assert!(!MembershipLink::validate_sns_domain("alice.sol")); // No dots allowed
    }

    #[test]
    fn test_size_calculation() {
        // Ensure SIZE is calculated correctly
        assert!(MembershipLink::SIZE > 0);
        // Size should be reasonable for rent calculation
        assert!(MembershipLink::SIZE < 1000);
    }
}
