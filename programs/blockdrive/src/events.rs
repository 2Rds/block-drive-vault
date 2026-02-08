use anchor_lang::prelude::*;
use crate::instructions::membership::BurnReason;
use crate::transfer_hook::TransferAction;

// ============================================================================
// SHARDING EVENTS
// ============================================================================

/// Emitted when a new Vault Master is created
#[event]
pub struct VaultMasterCreated {
    /// The wallet owner
    pub owner: Pubkey,
    /// The VaultMaster PDA address
    pub vault_master: Pubkey,
    /// The VaultIndex PDA address
    pub vault_index: Pubkey,
    /// Creation timestamp
    pub timestamp: i64,
}

/// Emitted when a new Shard is created
#[event]
pub struct ShardCreated {
    /// The parent VaultMaster
    pub vault_master: Pubkey,
    /// The new VaultShard PDA address
    pub vault_shard: Pubkey,
    /// The shard index (0-9)
    pub shard_index: u8,
    /// The wallet owner
    pub owner: Pubkey,
    /// Creation timestamp
    pub timestamp: i64,
}

/// Emitted when a file is registered to a shard
#[event]
pub struct FileRegisteredSharded {
    /// The VaultMaster
    pub vault_master: Pubkey,
    /// The VaultShard where file was stored
    pub vault_shard: Pubkey,
    /// The FileRecord PDA
    pub file_record: Pubkey,
    /// The unique file ID
    pub file_id: [u8; 16],
    /// Shard index where file is stored
    pub shard_index: u8,
    /// Slot index within the shard
    pub slot_index: u8,
    /// Original file size
    pub file_size: u64,
    /// Encrypted file size
    pub encrypted_size: u64,
    /// Security level used
    pub security_level: u8,
    /// Registration timestamp
    pub timestamp: i64,
}

/// Emitted when a Vault Index is created
#[event]
pub struct VaultIndexCreated {
    /// The parent VaultMaster
    pub vault_master: Pubkey,
    /// The VaultIndex PDA address
    pub vault_index: Pubkey,
    /// The wallet owner
    pub owner: Pubkey,
    /// Creation timestamp
    pub timestamp: i64,
}

// ============================================================================
// SESSION DELEGATION EVENTS
// ============================================================================

/// Emitted when a new session delegation is created
#[event]
pub struct SessionDelegationCreated {
    /// The wallet owner (delegator)
    pub owner: Pubkey,
    /// The relayer (delegate)
    pub relayer: Pubkey,
    /// The SessionDelegation PDA address
    pub session: Pubkey,
    /// Bitmap of allowed operations
    pub allowed_operations: u8,
    /// Expiration timestamp
    pub expires_at: i64,
    /// Maximum operations allowed (0 = unlimited)
    pub max_operations: u32,
    /// Creation timestamp
    pub timestamp: i64,
}

/// Emitted when a session delegation is revoked
#[event]
pub struct SessionDelegationRevoked {
    /// The wallet owner
    pub owner: Pubkey,
    /// The relayer
    pub relayer: Pubkey,
    /// The SessionDelegation PDA address
    pub session: Pubkey,
    /// Total operations used before revocation
    pub operations_used: u32,
    /// Revocation timestamp
    pub timestamp: i64,
}

/// Emitted when a session duration is extended
#[event]
pub struct SessionDelegationExtended {
    /// The SessionDelegation PDA address
    pub session: Pubkey,
    /// Previous expiration timestamp
    pub old_expires_at: i64,
    /// New expiration timestamp
    pub new_expires_at: i64,
    /// Extension timestamp
    pub timestamp: i64,
}

#[event]
pub struct VaultCreated {
    pub owner: Pubkey,
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultFrozen {
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultUnfrozen {
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MasterKeyRotated {
    pub vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FileRegistered {
    pub vault: Pubkey,
    pub file_id: [u8; 16],
    pub file_record: Pubkey,
    pub file_size: u64,
    pub encrypted_size: u64,
    pub security_level: u8,
    pub timestamp: i64,
}

#[event]
pub struct FileStorageUpdated {
    pub file_record: Pubkey,
    pub provider_count: u8,
    pub timestamp: i64,
}

#[event]
pub struct FileArchived {
    pub vault: Pubkey,
    pub file_record: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct FileDeleted {
    pub vault: Pubkey,
    pub file_id: [u8; 16],
    pub file_size: u64,
    pub timestamp: i64,
}

#[event]
pub struct FileAccessed {
    pub file_record: Pubkey,
    pub accessor: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DelegationCreated {
    pub file_record: Pubkey,
    pub grantor: Pubkey,
    pub grantee: Pubkey,
    pub permission_level: u8,
    pub expires_at: i64,
    pub timestamp: i64,
}

#[event]
pub struct DelegationRevoked {
    pub file_record: Pubkey,
    pub grantor: Pubkey,
    pub grantee: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DelegationUpdated {
    pub file_record: Pubkey,
    pub grantee: Pubkey,
    pub permission_level: u8,
    pub expires_at: i64,
    pub timestamp: i64,
}

// ============================================================================
// MEMBERSHIP EVENTS
// ============================================================================

/// Emitted when a new membership link is created
#[event]
pub struct MembershipLinkCreated {
    /// The wallet address the membership is linked to
    pub wallet: Pubkey,
    /// The MembershipLink PDA address
    pub membership_link: Pubkey,
    /// The SNS domain linked (if any)
    pub sns_domain: String,
    /// The soulbound NFT mint address
    pub nft_mint: Pubkey,
    /// Creation timestamp
    pub timestamp: i64,
}

/// Emitted when a membership link is updated
#[event]
pub struct MembershipLinkUpdated {
    /// The wallet address
    pub wallet: Pubkey,
    /// The MembershipLink PDA address
    pub membership_link: Pubkey,
    /// The current SNS domain
    pub sns_domain: String,
    /// The current NFT mint address
    pub nft_mint: Pubkey,
    /// Update timestamp
    pub timestamp: i64,
}

/// Emitted when a membership link is deactivated
#[event]
pub struct MembershipLinkDeactivated {
    /// The wallet address
    pub wallet: Pubkey,
    /// The MembershipLink PDA address
    pub membership_link: Pubkey,
    /// Deactivation timestamp
    pub timestamp: i64,
}

/// Emitted when a soulbound membership NFT is minted
#[event]
pub struct MembershipNftMinted {
    /// The wallet receiving the NFT
    pub wallet: Pubkey,
    /// The NFT mint address
    pub nft_mint: Pubkey,
    /// Mint timestamp
    pub timestamp: i64,
}

/// Emitted when a soulbound membership NFT is burned
#[event]
pub struct MembershipNftBurned {
    /// The wallet that held the NFT
    pub wallet: Pubkey,
    /// The NFT mint address
    pub nft_mint: Pubkey,
    /// Reason for the burn
    pub reason: BurnReason,
    /// Burn timestamp
    pub timestamp: i64,
}

// ============================================================================
// TRANSFER HOOK EVENTS
// ============================================================================

/// Emitted when the transfer hook executes
#[event]
pub struct TransferHookExecuted {
    /// The NFT mint
    pub mint: Pubkey,
    /// Source token account
    pub source: Pubkey,
    /// Destination token account
    pub destination: Pubkey,
    /// Amount being transferred
    pub amount: u64,
    /// Action taken by the hook
    pub action: TransferAction,
    /// Execution timestamp
    pub timestamp: i64,
}

/// Security event types for monitoring
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum SecurityEventType {
    /// Transfer hook was initialized
    HookInitialized = 0,
    /// Transfer hook was enabled
    HookEnabled = 1,
    /// Transfer hook was disabled (emergency)
    HookDisabled = 2,
    /// Unauthorized transfer was attempted
    UnauthorizedTransferAttempt = 3,
    /// Auto-burn was triggered
    AutoBurnTriggered = 4,
}

/// Emitted for security-relevant events (for monitoring/alerting)
#[event]
pub struct SecurityEvent {
    /// Type of security event
    pub event_type: SecurityEventType,
    /// Related mint (if applicable)
    pub mint: Pubkey,
    /// Source address (if applicable)
    pub source: Pubkey,
    /// Destination address (if applicable)
    pub destination: Pubkey,
    /// Amount involved (if applicable)
    pub amount: u64,
    /// Event timestamp
    pub timestamp: i64,
    /// Additional details
    pub details: String,
}
