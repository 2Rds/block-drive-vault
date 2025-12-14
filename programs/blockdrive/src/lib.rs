use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;
pub mod events;

use instructions::*;

declare_id!("BLKDrv1111111111111111111111111111111111111");

#[program]
pub mod blockdrive {
    use super::*;

    /// Initialize a new user vault
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        master_key_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::vault::initialize_vault(ctx, master_key_commitment)
    }

    /// Rotate the master key commitment
    pub fn rotate_master_key(
        ctx: Context<RotateMasterKey>,
        new_commitment: [u8; 32],
    ) -> Result<()> {
        instructions::vault::rotate_master_key(ctx, new_commitment)
    }

    /// Freeze a vault (emergency)
    pub fn freeze_vault(ctx: Context<FreezeVault>) -> Result<()> {
        instructions::vault::freeze_vault(ctx)
    }

    /// Unfreeze a vault
    pub fn unfreeze_vault(ctx: Context<UnfreezeVault>) -> Result<()> {
        instructions::vault::unfreeze_vault(ctx)
    }

    /// Register a new encrypted file
    pub fn register_file(
        ctx: Context<RegisterFile>,
        file_id: [u8; 16],
        filename_hash: [u8; 32],
        file_size: u64,
        encrypted_size: u64,
        mime_type_hash: [u8; 32],
        security_level: u8,
        encryption_commitment: [u8; 32],
        critical_bytes_commitment: [u8; 32],
        primary_cid: [u8; 64],
    ) -> Result<()> {
        instructions::file::register_file(
            ctx,
            file_id,
            filename_hash,
            file_size,
            encrypted_size,
            mime_type_hash,
            security_level,
            encryption_commitment,
            critical_bytes_commitment,
            primary_cid,
        )
    }

    /// Update file storage with redundancy info
    pub fn update_file_storage(
        ctx: Context<UpdateFileStorage>,
        redundancy_cid: [u8; 64],
        provider_count: u8,
    ) -> Result<()> {
        instructions::file::update_file_storage(ctx, redundancy_cid, provider_count)
    }

    /// Archive a file
    pub fn archive_file(ctx: Context<ArchiveFile>) -> Result<()> {
        instructions::file::archive_file(ctx)
    }

    /// Delete a file record
    pub fn delete_file(ctx: Context<DeleteFile>) -> Result<()> {
        instructions::file::delete_file(ctx)
    }

    /// Record file access
    pub fn record_access(ctx: Context<RecordAccess>) -> Result<()> {
        instructions::file::record_access(ctx)
    }

    /// Create a new file delegation
    pub fn create_delegation(
        ctx: Context<CreateDelegation>,
        encrypted_file_key: [u8; 128],
        permission_level: u8,
        expires_at: i64,
    ) -> Result<()> {
        instructions::delegation::create_delegation(
            ctx,
            encrypted_file_key,
            permission_level,
            expires_at,
        )
    }

    /// Revoke a delegation
    pub fn revoke_delegation(ctx: Context<RevokeDelegation>) -> Result<()> {
        instructions::delegation::revoke_delegation(ctx)
    }

    /// Update delegation permissions
    pub fn update_delegation(
        ctx: Context<UpdateDelegation>,
        permission_level: u8,
        expires_at: i64,
    ) -> Result<()> {
        instructions::delegation::update_delegation(ctx, permission_level, expires_at)
    }
}
