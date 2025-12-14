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
}
