use anchor_lang::prelude::*;

/// Permission level enumeration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default)]
pub enum PermissionLevel {
    #[default]
    View = 0,      // Can view file metadata
    Download = 1,  // Can download and decrypt file
    Reshare = 2,   // Can create sub-delegations
}

impl PermissionLevel {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(PermissionLevel::View),
            1 => Some(PermissionLevel::Download),
            2 => Some(PermissionLevel::Reshare),
            _ => None,
        }
    }
}

/// Delegation PDA - manages file access delegation between users
/// Seeds: ["delegation", file_record_pubkey, grantee_pubkey]
#[account]
pub struct Delegation {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// File record this delegation is for
    pub file_record: Pubkey,

    /// Owner who granted delegation
    pub grantor: Pubkey,

    /// Wallet receiving delegation
    pub grantee: Pubkey,

    /// Encrypted file key for grantee
    /// (file_key encrypted with grantee's public key via ECDH)
    pub encrypted_file_key: [u8; 128],

    /// Permission level
    pub permission_level: PermissionLevel,

    /// Expiration timestamp (0 = no expiry)
    pub expires_at: i64,

    /// Delegation creation timestamp
    pub created_at: i64,

    /// Is delegation currently active
    pub is_active: bool,

    /// Whether grantee has accepted/claimed the delegation
    pub is_accepted: bool,

    /// Number of times accessed
    pub access_count: u64,

    /// Last access timestamp
    pub last_accessed_at: i64,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl Delegation {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +   // discriminator
        1 +   // bump
        32 +  // file_record
        32 +  // grantor
        32 +  // grantee
        128 + // encrypted_file_key
        1 +   // permission_level
        8 +   // expires_at
        8 +   // created_at
        1 +   // is_active
        1 +   // is_accepted
        8 +   // access_count
        8 +   // last_accessed_at
        32;   // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"delegation";

    /// Check if delegation is expired
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        self.expires_at > 0 && current_timestamp > self.expires_at
    }

    /// Check if delegation is valid (active and not expired)
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_active && !self.is_expired(current_timestamp)
    }

    /// Record an access
    pub fn record_access(&mut self, timestamp: i64) {
        self.access_count = self.access_count.saturating_add(1);
        self.last_accessed_at = timestamp;
    }

    /// Check if grantee can download
    pub fn can_download(&self) -> bool {
        matches!(self.permission_level, PermissionLevel::Download | PermissionLevel::Reshare)
    }

    /// Check if grantee can reshare
    pub fn can_reshare(&self) -> bool {
        matches!(self.permission_level, PermissionLevel::Reshare)
    }
}

impl Default for Delegation {
    fn default() -> Self {
        Self {
            bump: 0,
            file_record: Pubkey::default(),
            grantor: Pubkey::default(),
            grantee: Pubkey::default(),
            encrypted_file_key: [0u8; 128],
            permission_level: PermissionLevel::View,
            expires_at: 0,
            created_at: 0,
            is_active: false,
            is_accepted: false,
            access_count: 0,
            last_accessed_at: 0,
            reserved: [0u8; 32],
        }
    }
}
