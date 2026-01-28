use anchor_lang::prelude::*;
use crate::errors::BlockDriveError;

/// Default session duration: 24 hours in seconds
pub const DEFAULT_SESSION_DURATION: i64 = 24 * 60 * 60;

/// Maximum session duration: 7 days in seconds
pub const MAX_SESSION_DURATION: i64 = 7 * 24 * 60 * 60;

/// Operation permission flags (bitmap)
pub mod OperationFlags {
    /// Permission to upload/register new files
    pub const UPLOAD: u8 = 0b00000001;
    /// Permission to update existing file metadata
    pub const UPDATE: u8 = 0b00000010;
    /// Permission to create new shards
    pub const CREATE_SHARD: u8 = 0b00000100;
    /// Permission to archive files (soft delete)
    pub const ARCHIVE: u8 = 0b00001000;
    // Note: DELETE (hard delete) is intentionally NOT delegatable for security
}

/// SessionDelegation PDA - Grants a relayer permission to act on behalf of user
/// This enables gasless operations where the relayer pays transaction fees
/// Seeds: ["session", owner_pubkey, relayer_pubkey]
#[account]
pub struct SessionDelegation {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// User's wallet public key (the delegator)
    pub owner: Pubkey,

    /// Trusted backend relayer wallet (the delegate)
    pub relayer: Pubkey,

    /// Nonce for replay attack protection
    /// Incremented with each delegated operation
    pub nonce: u64,

    /// Bitmap of allowed operations (see OperationFlags)
    /// e.g., UPLOAD | UPDATE = 0b00000011
    pub allowed_operations: u8,

    /// Session creation timestamp
    pub created_at: i64,

    /// Session expiration timestamp
    /// After this time, delegation is invalid
    pub expires_at: i64,

    /// Whether the session is currently active
    /// Can be revoked by owner before expiration
    pub is_active: bool,

    /// Maximum number of operations allowed (0 = unlimited)
    pub max_operations: u32,

    /// Number of operations used so far
    pub operations_used: u32,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl SessionDelegation {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +   // discriminator
        1 +                        // bump
        32 +                       // owner
        32 +                       // relayer
        8 +                        // nonce
        1 +                        // allowed_operations
        8 +                        // created_at
        8 +                        // expires_at
        1 +                        // is_active
        4 +                        // max_operations
        4 +                        // operations_used
        32;                        // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"session";

    /// Initialize a new session delegation
    pub fn initialize(
        &mut self,
        bump: u8,
        owner: Pubkey,
        relayer: Pubkey,
        allowed_operations: u8,
        duration: i64,
        max_operations: u32,
        timestamp: i64,
    ) -> Result<()> {
        // Validate duration
        require!(
            duration > 0 && duration <= MAX_SESSION_DURATION,
            BlockDriveError::InvalidExpiration
        );

        // Prevent self-delegation
        require!(
            owner != relayer,
            BlockDriveError::CannotDelegateToSelf
        );

        self.bump = bump;
        self.owner = owner;
        self.relayer = relayer;
        self.nonce = 0;
        self.allowed_operations = allowed_operations;
        self.created_at = timestamp;
        self.expires_at = timestamp.saturating_add(duration);
        self.is_active = true;
        self.max_operations = max_operations;
        self.operations_used = 0;
        self.reserved = [0u8; 32];

        Ok(())
    }

    /// Check if session is valid and active
    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.is_active && current_timestamp < self.expires_at
    }

    /// Check if session has expired
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp >= self.expires_at
    }

    /// Check if a specific operation is permitted
    pub fn can_perform(&self, operation: u8) -> bool {
        (self.allowed_operations & operation) == operation
    }

    /// Check if operation limit has been reached
    pub fn has_remaining_operations(&self) -> bool {
        // 0 means unlimited
        self.max_operations == 0 || self.operations_used < self.max_operations
    }

    /// Validate and consume an operation
    /// Returns the new nonce value for verification
    pub fn use_operation(
        &mut self,
        operation: u8,
        expected_nonce: u64,
        current_timestamp: i64,
    ) -> Result<u64> {
        // Check session is valid
        require!(
            self.is_valid(current_timestamp),
            BlockDriveError::DelegationExpired
        );

        // Check operation is permitted
        require!(
            self.can_perform(operation),
            BlockDriveError::InsufficientPermissions
        );

        // Check operation limit
        require!(
            self.has_remaining_operations(),
            BlockDriveError::DelegationNotActive
        );

        // Verify nonce to prevent replay attacks
        require!(
            expected_nonce == self.nonce,
            BlockDriveError::InvalidCommitment // Using existing error for nonce mismatch
        );

        // Increment counters
        self.nonce = self.nonce.saturating_add(1);
        self.operations_used = self.operations_used.saturating_add(1);

        Ok(self.nonce)
    }

    /// Revoke the session (owner only)
    pub fn revoke(&mut self) {
        self.is_active = false;
    }

    /// Extend session duration (owner only)
    pub fn extend(&mut self, additional_duration: i64, current_timestamp: i64) -> Result<()> {
        let new_expiry = self.expires_at.saturating_add(additional_duration);
        let max_expiry = current_timestamp.saturating_add(MAX_SESSION_DURATION);

        // Cannot extend beyond max duration from now
        require!(
            new_expiry <= max_expiry,
            BlockDriveError::InvalidExpiration
        );

        self.expires_at = new_expiry;
        Ok(())
    }

    /// Get remaining time in seconds (0 if expired)
    pub fn remaining_time(&self, current_timestamp: i64) -> i64 {
        if current_timestamp >= self.expires_at {
            0
        } else {
            self.expires_at - current_timestamp
        }
    }

    /// Get remaining operations (u32::MAX if unlimited)
    pub fn remaining_operations(&self) -> u32 {
        if self.max_operations == 0 {
            u32::MAX
        } else {
            self.max_operations.saturating_sub(self.operations_used)
        }
    }
}

impl Default for SessionDelegation {
    fn default() -> Self {
        Self {
            bump: 0,
            owner: Pubkey::default(),
            relayer: Pubkey::default(),
            nonce: 0,
            allowed_operations: 0,
            created_at: 0,
            expires_at: 0,
            is_active: false,
            max_operations: 0,
            operations_used: 0,
            reserved: [0u8; 32],
        }
    }
}
