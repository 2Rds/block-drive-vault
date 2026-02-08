use anchor_lang::prelude::*;
use crate::state::{FileRecord, Delegation, PermissionLevel};
use crate::errors::BlockDriveError;
use crate::events::{DelegationCreated, DelegationRevoked, DelegationUpdated};

#[derive(Accounts)]
pub struct CreateDelegation<'info> {
    #[account(
        init,
        payer = grantor,
        space = Delegation::SIZE,
        seeds = [Delegation::SEED_PREFIX, file_record.key().as_ref(), grantee.key().as_ref()],
        bump
    )]
    pub delegation: Account<'info, Delegation>,

    #[account(
        mut,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub file_record: Account<'info, FileRecord>,

    /// The file owner granting access
    #[account(mut)]
    pub grantor: Signer<'info>,

    /// CHECK: The wallet receiving delegation (doesn't need to sign)
    pub grantee: UncheckedAccount<'info>,

    /// The owner must match file_record.owner
    /// CHECK: Verified via has_one constraint
    pub owner: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeDelegation<'info> {
    #[account(
        mut,
        close = grantor,
        has_one = grantor @ BlockDriveError::Unauthorized,
        has_one = file_record
    )]
    pub delegation: Account<'info, Delegation>,

    #[account(mut)]
    pub file_record: Account<'info, FileRecord>,

    #[account(mut)]
    pub grantor: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateDelegation<'info> {
    #[account(
        mut,
        has_one = grantor @ BlockDriveError::Unauthorized
    )]
    pub delegation: Account<'info, Delegation>,

    pub grantor: Signer<'info>,
}

/// Create a new file delegation
pub fn create_delegation(
    ctx: Context<CreateDelegation>,
    encrypted_file_key: [u8; 128],
    permission_level: u8,
    expires_at: i64,
) -> Result<()> {
    let delegation = &mut ctx.accounts.delegation;
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    // Validate file is active
    require!(file_record.is_active(), BlockDriveError::FileNotActive);

    // Cannot delegate to self
    require!(
        ctx.accounts.grantor.key() != ctx.accounts.grantee.key(),
        BlockDriveError::CannotDelegateToSelf
    );

    // Validate permission level
    let perm_level = PermissionLevel::from_u8(permission_level)
        .ok_or(BlockDriveError::InvalidPermissionLevel)?;

    // Validate expiration (must be in future or 0 for no expiry)
    if expires_at > 0 {
        require!(
            expires_at > clock.unix_timestamp,
            BlockDriveError::InvalidExpiration
        );
    }

    // Initialize delegation
    delegation.bump = ctx.bumps.delegation;
    delegation.file_record = file_record.key();
    delegation.grantor = ctx.accounts.grantor.key();
    delegation.grantee = ctx.accounts.grantee.key();
    delegation.encrypted_file_key = encrypted_file_key;
    delegation.permission_level = perm_level;
    delegation.expires_at = expires_at;
    delegation.created_at = clock.unix_timestamp;
    delegation.is_active = true;
    delegation.is_accepted = false;
    delegation.access_count = 0;
    delegation.last_accessed_at = 0;
    delegation.reserved = [0u8; 32];

    // Update file record
    file_record.add_delegation();

    emit!(DelegationCreated {
        file_record: file_record.key(),
        grantor: ctx.accounts.grantor.key(),
        grantee: ctx.accounts.grantee.key(),
        permission_level,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Revoke a delegation
pub fn revoke_delegation(ctx: Context<RevokeDelegation>) -> Result<()> {
    let delegation = &ctx.accounts.delegation;
    let file_record = &mut ctx.accounts.file_record;
    let clock = Clock::get()?;

    // Update file record
    file_record.remove_delegation();

    emit!(DelegationRevoked {
        file_record: file_record.key(),
        grantor: delegation.grantor,
        grantee: delegation.grantee,
        timestamp: clock.unix_timestamp,
    });

    // Account is closed automatically via `close = grantor` constraint
    Ok(())
}

/// Update delegation permissions
pub fn update_delegation(
    ctx: Context<UpdateDelegation>,
    permission_level: u8,
    expires_at: i64,
) -> Result<()> {
    let delegation = &mut ctx.accounts.delegation;
    let clock = Clock::get()?;

    require!(delegation.is_active, BlockDriveError::DelegationNotActive);

    // Validate permission level
    let perm_level = PermissionLevel::from_u8(permission_level)
        .ok_or(BlockDriveError::InvalidPermissionLevel)?;

    // Validate expiration
    if expires_at > 0 {
        require!(
            expires_at > clock.unix_timestamp,
            BlockDriveError::InvalidExpiration
        );
    }

    delegation.permission_level = perm_level;
    delegation.expires_at = expires_at;

    emit!(DelegationUpdated {
        file_record: delegation.file_record,
        grantee: delegation.grantee,
        permission_level,
        expires_at,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
