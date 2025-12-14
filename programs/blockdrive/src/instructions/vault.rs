use anchor_lang::prelude::*;
use crate::state::{UserVault, VaultStatus};
use crate::errors::BlockDriveError;
use crate::events::{VaultCreated, VaultFrozen, VaultUnfrozen, MasterKeyRotated};

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = owner,
        space = UserVault::SIZE,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, UserVault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RotateMasterKey<'info> {
    #[account(
        mut,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct FreezeVault<'info> {
    #[account(
        mut,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnfreezeVault<'info> {
    #[account(
        mut,
        seeds = [UserVault::SEED_PREFIX, owner.key().as_ref()],
        bump = vault.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub vault: Account<'info, UserVault>,

    pub owner: Signer<'info>,
}

/// Initialize a new user vault
pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    master_key_commitment: [u8; 32],
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    vault.bump = ctx.bumps.vault;
    vault.owner = ctx.accounts.owner.key();
    vault.master_key_commitment = master_key_commitment;
    vault.file_count = 0;
    vault.total_storage = 0;
    vault.created_at = clock.unix_timestamp;
    vault.updated_at = clock.unix_timestamp;
    vault.status = VaultStatus::Active;
    vault.reserved = [0u8; 64];

    emit!(VaultCreated {
        owner: ctx.accounts.owner.key(),
        vault: vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Rotate the master key commitment
pub fn rotate_master_key(
    ctx: Context<RotateMasterKey>,
    new_commitment: [u8; 32],
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(vault.is_active(), BlockDriveError::VaultNotActive);

    vault.master_key_commitment = new_commitment;
    vault.updated_at = clock.unix_timestamp;

    emit!(MasterKeyRotated {
        vault: vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Freeze a vault (emergency)
pub fn freeze_vault(ctx: Context<FreezeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(vault.is_active(), BlockDriveError::VaultNotActive);

    vault.status = VaultStatus::Frozen;
    vault.updated_at = clock.unix_timestamp;

    emit!(VaultFrozen {
        vault: vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Unfreeze a vault
pub fn unfreeze_vault(ctx: Context<UnfreezeVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    require!(vault.is_frozen(), BlockDriveError::VaultNotActive);

    vault.status = VaultStatus::Active;
    vault.updated_at = clock.unix_timestamp;

    emit!(VaultUnfrozen {
        vault: vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
