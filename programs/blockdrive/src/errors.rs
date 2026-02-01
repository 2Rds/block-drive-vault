use anchor_lang::prelude::*;

#[error_code]
pub enum BlockDriveError {
    #[msg("Vault already exists for this wallet")]
    VaultAlreadyExists,

    #[msg("Vault not found")]
    VaultNotFound,

    #[msg("Vault is frozen")]
    VaultFrozen,

    #[msg("Vault is not active")]
    VaultNotActive,

    #[msg("File already exists")]
    FileAlreadyExists,

    #[msg("File not found")]
    FileNotFound,

    #[msg("File is not active")]
    FileNotActive,

    #[msg("Invalid commitment hash")]
    InvalidCommitment,

    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Delegation expired")]
    DelegationExpired,

    #[msg("Delegation not active")]
    DelegationNotActive,

    #[msg("Delegation already exists")]
    DelegationAlreadyExists,

    #[msg("Invalid permission level")]
    InvalidPermissionLevel,

    #[msg("File size exceeds limit")]
    FileSizeExceeded,

    #[msg("Vault file limit reached")]
    VaultFileLimitReached,

    #[msg("Program is paused")]
    ProgramPaused,

    #[msg("Invalid security level")]
    InvalidSecurityLevel,

    #[msg("Insufficient funds for fee")]
    InsufficientFunds,

    #[msg("Invalid CID format")]
    InvalidCid,

    #[msg("Cannot delegate to self")]
    CannotDelegateToSelf,

    #[msg("Insufficient permissions")]
    InsufficientPermissions,

    #[msg("Invalid expiration time")]
    InvalidExpiration,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    // =========================================================================
    // SHARDING ERRORS
    // =========================================================================

    #[msg("Vault master already exists for this wallet")]
    VaultMasterAlreadyExists,

    #[msg("Vault master not found")]
    VaultMasterNotFound,

    #[msg("Maximum number of shards (10) reached - cannot store more than 1000 files")]
    MaxShardsReached,

    #[msg("Invalid shard index - must create shards sequentially")]
    InvalidShardIndex,

    #[msg("Shard is full - cannot add more files to this shard")]
    ShardFull,

    #[msg("Shard not found")]
    ShardNotFound,

    #[msg("No available shard to store file - create a new shard first")]
    NoAvailableShard,

    #[msg("Vault index is full - maximum 1000 files supported")]
    IndexFull,

    #[msg("File ID already exists in vault")]
    DuplicateFileId,

    #[msg("Slot index is out of bounds")]
    InvalidSlotIndex,
}
