use anchor_lang::prelude::*;
use crate::state::{UserVault, FileRecord, FileStatus, SecurityLevel};
use crate::errors::BlockDriveError;
use crate::events::{FileRegistered, FileStorageUpdated, FileArchived, FileDeleted, FileAccessed};

#[derive(Accounts)]
#[instruction(file_id: [u8; 16])]
pub struct RegisterFile<'info> {
    #[account(
        init,
        payer = owner,
        space = FileRecord::SIZE,
        seeds = [FileRecord::SEED_PREFIX, vault.key().as_ref(), &file_id],
        bump
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(
        mut,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateFileStorage<'info> {
    #[account(
        mut,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct ArchiveFile<'info> {
    #[account(
        mut,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeleteFile<'info> {
    #[account(
        mut,
        close = owner,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(
        mut,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordAccess<'info> {
    #[account(mut)]
    pub file_record: Account<'info, FileRecord>,

    /// Can be owner or delegatee
    pub accessor: Signer<'info>,
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
    let vault = &mut ctx.accounts.vault;
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    // Validate vault is active
    require!(vault.is_active(), BlockDriveError::VaultNotActive);

    // Validate security level
    let sec_level = SecurityLevel::from_u8(security_level)
        .ok_or(BlockDriveError::InvalidSecurityLevel)?;

    // Initialize file record
    file_record.bump = ctx.bumps.file_record;
    file_record.vault = vault.key();
    file_record.owner = ctx.accounts.owner.key();
    file_record.file_id = file_id;
    file_record.filename_hash = filename_hash;
    file_record.file_size = file_size;
    file_record.encrypted_size = encrypted_size;
    file_record.mime_type_hash = mime_type_hash;
    file_record.security_level = sec_level;
    file_record.encryption_commitment = encryption_commitment;
    file_record.critical_bytes_commitment = critical_bytes_commitment;
    file_record.primary_cid = primary_cid;
    file_record.redundancy_cid = [0u8; 64];
    file_record.provider_count = 1;
    file_record.created_at = clock.unix_timestamp;
    file_record.accessed_at = clock.unix_timestamp;
    file_record.status = FileStatus::Active;
    file_record.is_shared = false;
    file_record.delegation_count = 0;
    file_record.reserved = [0u8; 32];

    // Update vault stats
    vault.add_file(file_size, clock.unix_timestamp);

    emit!(FileRegistered {
        vault: vault.key(),
        file_id,
        file_record: file_record.key(),
        file_size,
        encrypted_size,
        security_level,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Update file storage with redundancy info
pub fn update_file_storage(
    ctx: Context<UpdateFileStorage>,
    redundancy_cid: [u8; 64],
    provider_count: u8,
) -> Result<()> {
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    require!(file_record.is_active(), BlockDriveError::FileNotActive);

    file_record.redundancy_cid = redundancy_cid;
    file_record.provider_count = provider_count;

    emit!(FileStorageUpdated {
        file_record: file_record.key(),
        provider_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Archive a file
pub fn archive_file(ctx: Context<ArchiveFile>) -> Result<()> {
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    require!(file_record.is_active(), BlockDriveError::FileNotActive);

    file_record.status = FileStatus::Archived;

    emit!(FileArchived {
        vault: ctx.accounts.vault.key(),
        file_record: file_record.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Delete a file record
pub fn delete_file(ctx: Context<DeleteFile>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let file_record = &ctx.accounts.file_record;
    let clock = Clock::get()?;

    // Update vault stats before closing
    vault.remove_file(file_record.file_size, clock.unix_timestamp);

    emit!(FileDeleted {
        vault: vault.key(),
        file_id: file_record.file_id,
        file_size: file_record.file_size,
        timestamp: clock.unix_timestamp,
    });

    // Account is closed automatically via `close = owner` constraint
    Ok(())
}

/// Record file access
pub fn record_access(ctx: Context<RecordAccess>) -> Result<()> {
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    require!(file_record.is_active(), BlockDriveError::FileNotActive);

    file_record.record_access(clock.unix_timestamp);

    emit!(FileAccessed {
        file_record: file_record.key(),
        accessor: ctx.accounts.accessor.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
