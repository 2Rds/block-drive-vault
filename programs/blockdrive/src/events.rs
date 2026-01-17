use anchor_lang::prelude::*;
use crate::instructions::membership::BurnReason;
use crate::transfer_hook::TransferAction;

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
// GAS CREDITS EVENTS
// ============================================================================

#[event]
pub struct GasCreditsInitialized {
    pub owner: Pubkey,
    pub gas_credits: Pubkey,
    pub initial_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct GasCreditsAdded {
    pub owner: Pubkey,
    pub gas_credits: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
    pub timestamp: i64,
}

#[event]
pub struct GasCreditsDeducted {
    pub owner: Pubkey,
    pub gas_credits: Pubkey,
    pub amount: u64,
    pub operation_type: String,
    pub remaining_balance: u64,
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
