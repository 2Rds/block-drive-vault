use anchor_lang::prelude::*;

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
