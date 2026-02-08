use anchor_lang::prelude::*;
use crate::state::{
    UserVaultMaster, UserVaultShard, UserVaultIndex,
    IndexEntry, MAX_SHARDS, FILES_PER_SHARD, MAX_FILES_PER_SHARD,
    FileRecord, FileStatus, SecurityLevel,
};
use crate::errors::BlockDriveError;
use crate::events::{
    VaultMasterCreated, ShardCreated, FileRegisteredSharded,
    VaultIndexCreated,
};

// =============================================================================
// ACCOUNT CONTEXTS
// =============================================================================

/// Initialize the Vault Master - the root controller for sharded storage
#[derive(Accounts)]
pub struct InitializeVaultMaster<'info> {
    #[account(
        init,
        payer = owner,
        space = UserVaultMaster::SIZE,
        seeds = [UserVaultMaster::SEED_PREFIX, owner.key().as_ref()],
        bump
    )]
    pub vault_master: Account<'info, UserVaultMaster>,

    #[account(
        init,
        payer = owner,
        space = UserVaultIndex::MAX_SIZE,
        seeds = [UserVaultIndex::SEED_PREFIX, vault_master.key().as_ref()],
        bump
    )]
    pub vault_index: Account<'info, UserVaultIndex>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Create a new shard for storing files
#[derive(Accounts)]
#[instruction(shard_index: u8)]
pub struct CreateShard<'info> {
    #[account(
        mut,
        seeds = [UserVaultMaster::SEED_PREFIX, owner.key().as_ref()],
        bump = vault_master.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault_master: Account<'info, UserVaultMaster>,

    #[account(
        init,
        payer = owner,
        space = UserVaultShard::SIZE,
        seeds = [
            UserVaultShard::SEED_PREFIX,
            vault_master.key().as_ref(),
            &[shard_index]
        ],
        bump
    )]
    pub vault_shard: Account<'info, UserVaultShard>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Register a file to a specific shard (sharded version of register_file)
#[derive(Accounts)]
#[instruction(file_id: [u8; 16], shard_index: u8)]
pub struct RegisterFileSharded<'info> {
    #[account(
        mut,
        seeds = [UserVaultMaster::SEED_PREFIX, owner.key().as_ref()],
        bump = vault_master.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault_master: Account<'info, UserVaultMaster>,

    #[account(
        mut,
        seeds = [
            UserVaultShard::SEED_PREFIX,
            vault_master.key().as_ref(),
            &[shard_index]
        ],
        bump = vault_shard.bump,
        constraint = vault_shard.vault_master == vault_master.key() @ BlockDriveError::Unauthorized
    )]
    pub vault_shard: Account<'info, UserVaultShard>,

    #[account(
        mut,
        seeds = [UserVaultIndex::SEED_PREFIX, vault_master.key().as_ref()],
        bump = vault_index.bump,
        constraint = vault_index.vault_master == vault_master.key() @ BlockDriveError::Unauthorized
    )]
    pub vault_index: Account<'info, UserVaultIndex>,

    #[account(
        init,
        payer = owner,
        space = FileRecord::SIZE,
        seeds = [FileRecord::SEED_PREFIX, vault_master.key().as_ref(), &file_id],
        bump
    )]
    pub file_record: Account<'info, FileRecord>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Query the vault index to find a file's location
#[derive(Accounts)]
pub struct QueryFileLocation<'info> {
    #[account(
        seeds = [UserVaultMaster::SEED_PREFIX, owner.key().as_ref()],
        bump = vault_master.bump,
    )]
    pub vault_master: Account<'info, UserVaultMaster>,

    #[account(
        seeds = [UserVaultIndex::SEED_PREFIX, vault_master.key().as_ref()],
        bump = vault_index.bump,
    )]
    pub vault_index: Account<'info, UserVaultIndex>,

    pub owner: Signer<'info>,
}

// =============================================================================
// INSTRUCTION HANDLERS
// =============================================================================

/// Initialize a new Vault Master with its accompanying index
/// This is the first step when setting up sharded storage for a user
pub fn initialize_vault_master(ctx: Context<InitializeVaultMaster>) -> Result<()> {
    let clock = Clock::get()?;
    let owner = ctx.accounts.owner.key();

    // Initialize Vault Master
    let vault_master = &mut ctx.accounts.vault_master;
    vault_master.initialize(
        ctx.bumps.vault_master,
        owner,
        clock.unix_timestamp,
    );

    // Initialize Vault Index
    let vault_index = &mut ctx.accounts.vault_index;
    vault_index.initialize(
        ctx.bumps.vault_index,
        vault_master.key(),
        owner,
        clock.unix_timestamp,
    );

    emit!(VaultMasterCreated {
        owner,
        vault_master: vault_master.key(),
        vault_index: vault_index.key(),
        timestamp: clock.unix_timestamp,
    });

    msg!("Vault Master created for owner: {}", owner);
    Ok(())
}

/// Create a new shard for storing files
/// Shards are created incrementally as needed (when previous shard fills up)
pub fn create_shard(ctx: Context<CreateShard>, shard_index: u8) -> Result<()> {
    let clock = Clock::get()?;
    let vault_master = &mut ctx.accounts.vault_master;
    let vault_shard = &mut ctx.accounts.vault_shard;
    let owner = ctx.accounts.owner.key();

    // Validate shard index matches expected next shard
    require!(
        shard_index == vault_master.total_shards,
        BlockDriveError::InvalidShardIndex
    );

    // Check we haven't exceeded max shards
    require!(
        vault_master.can_create_shard(),
        BlockDriveError::MaxShardsReached
    );

    // Initialize the new shard
    vault_shard.initialize(
        ctx.bumps.vault_shard,
        vault_master.key(),
        owner,
        shard_index,
        clock.unix_timestamp,
    );

    // Register shard in vault master
    vault_master.register_shard(vault_shard.key(), clock.unix_timestamp)?;

    emit!(ShardCreated {
        vault_master: vault_master.key(),
        vault_shard: vault_shard.key(),
        shard_index,
        owner,
        timestamp: clock.unix_timestamp,
    });

    msg!("Shard {} created for vault master", shard_index);
    Ok(())
}

/// Register a new file to a specific shard
/// This is the sharded version of register_file that works with the multi-PDA system
pub fn register_file_sharded(
    ctx: Context<RegisterFileSharded>,
    file_id: [u8; 16],
    shard_index: u8,
    filename_hash: [u8; 32],
    file_size: u64,
    encrypted_size: u64,
    mime_type_hash: [u8; 32],
    security_level: u8,
    encryption_commitment: [u8; 32],
    critical_bytes_commitment: [u8; 32],
    primary_cid: [u8; 64],
) -> Result<()> {
    let clock = Clock::get()?;
    let vault_master = &mut ctx.accounts.vault_master;
    let vault_shard = &mut ctx.accounts.vault_shard;
    let vault_index = &mut ctx.accounts.vault_index;
    let file_record = &mut ctx.accounts.file_record;
    let owner = ctx.accounts.owner.key();

    // Validate shard index
    require!(
        shard_index < vault_master.total_shards,
        BlockDriveError::InvalidShardIndex
    );

    // Validate shard has capacity
    require!(
        vault_shard.has_capacity(),
        BlockDriveError::ShardFull
    );

    // Validate security level
    let sec_level = SecurityLevel::from_u8(security_level)
        .ok_or(BlockDriveError::InvalidSecurityLevel)?;

    // Initialize the file record
    file_record.bump = ctx.bumps.file_record;
    file_record.vault = vault_master.key(); // Points to master now
    file_record.owner = owner;
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

    // Add file record to shard
    let slot_index = vault_shard.add_file(file_record.key(), clock.unix_timestamp)?;

    // Add entry to index for fast lookups
    vault_index.add_entry(file_id, shard_index, slot_index, clock.unix_timestamp)?;

    // Update master totals
    vault_master.add_file(file_size, clock.unix_timestamp);

    emit!(FileRegisteredSharded {
        vault_master: vault_master.key(),
        vault_shard: vault_shard.key(),
        file_record: file_record.key(),
        file_id,
        shard_index,
        slot_index,
        file_size,
        encrypted_size,
        security_level,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "File registered to shard {} slot {} (total files: {})",
        shard_index,
        slot_index,
        vault_master.total_file_count
    );

    Ok(())
}

/// Query the vault index to find which shard contains a file
/// Returns (shard_index, slot_index) or error if not found
/// Note: This is a read-only instruction for client convenience
pub fn query_file_location(
    ctx: Context<QueryFileLocation>,
    file_id: [u8; 16],
) -> Result<(u8, u8)> {
    let vault_index = &ctx.accounts.vault_index;

    let location = vault_index
        .find_entry(&file_id)
        .ok_or(BlockDriveError::FileNotFound)?;

    msg!("File {} found at shard {} slot {}", 
        hex::encode(file_id), location.0, location.1);

    Ok(location)
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Derive the Vault Master PDA address
pub fn derive_vault_master_pda(owner: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[UserVaultMaster::SEED_PREFIX, owner.as_ref()],
        program_id,
    )
}

/// Derive a Vault Shard PDA address
pub fn derive_vault_shard_pda(
    vault_master: &Pubkey,
    shard_index: u8,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            UserVaultShard::SEED_PREFIX,
            vault_master.as_ref(),
            &[shard_index],
        ],
        program_id,
    )
}

/// Derive the Vault Index PDA address
pub fn derive_vault_index_pda(vault_master: &Pubkey, program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[UserVaultIndex::SEED_PREFIX, vault_master.as_ref()],
        program_id,
    )
}

/// Derive a FileRecord PDA address (sharded version)
pub fn derive_file_record_pda(
    vault_master: &Pubkey,
    file_id: &[u8; 16],
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[FileRecord::SEED_PREFIX, vault_master.as_ref(), file_id],
        program_id,
    )
}
