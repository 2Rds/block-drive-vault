use anchor_lang::prelude::*;
use crate::state::{SessionDelegation, DEFAULT_SESSION_DURATION};
use crate::errors::BlockDriveError;
use crate::events::{SessionDelegationCreated, SessionDelegationRevoked, SessionDelegationExtended};

// =============================================================================
// ACCOUNT CONTEXTS
// =============================================================================

/// Create a new session delegation to authorize a relayer
#[derive(Accounts)]
pub struct CreateSessionDelegation<'info> {
    #[account(
        init,
        payer = owner,
        space = SessionDelegation::SIZE,
        seeds = [
            SessionDelegation::SEED_PREFIX,
            owner.key().as_ref(),
            relayer.key().as_ref()
        ],
        bump
    )]
    pub session: Account<'info, SessionDelegation>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// CHECK: Relayer pubkey to delegate to (doesn't need to sign)
    pub relayer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Revoke an existing session delegation
#[derive(Accounts)]
pub struct RevokeSession<'info> {
    #[account(
        mut,
        seeds = [
            SessionDelegation::SEED_PREFIX,
            owner.key().as_ref(),
            session.relayer.as_ref()
        ],
        bump = session.bump,
        has_one = owner @ BlockDriveError::Unauthorized,
        constraint = session.is_active @ BlockDriveError::DelegationNotActive
    )]
    pub session: Account<'info, SessionDelegation>,

    pub owner: Signer<'info>,
}

/// Extend session duration
#[derive(Accounts)]
pub struct ExtendSession<'info> {
    #[account(
        mut,
        seeds = [
            SessionDelegation::SEED_PREFIX,
            owner.key().as_ref(),
            session.relayer.as_ref()
        ],
        bump = session.bump,
        has_one = owner @ BlockDriveError::Unauthorized,
        constraint = session.is_active @ BlockDriveError::DelegationNotActive
    )]
    pub session: Account<'info, SessionDelegation>,

    pub owner: Signer<'info>,
}

/// Close/delete a session delegation and recover rent
#[derive(Accounts)]
pub struct CloseSession<'info> {
    #[account(
        mut,
        seeds = [
            SessionDelegation::SEED_PREFIX,
            owner.key().as_ref(),
            session.relayer.as_ref()
        ],
        bump = session.bump,
        has_one = owner @ BlockDriveError::Unauthorized,
        close = owner
    )]
    pub session: Account<'info, SessionDelegation>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

/// Validate a session for relayer operations (read-only check)
#[derive(Accounts)]
pub struct ValidateSession<'info> {
    #[account(
        seeds = [
            SessionDelegation::SEED_PREFIX,
            session.owner.as_ref(),
            relayer.key().as_ref()
        ],
        bump = session.bump,
    )]
    pub session: Account<'info, SessionDelegation>,

    pub relayer: Signer<'info>,
}

// =============================================================================
// INSTRUCTION HANDLERS
// =============================================================================

/// Create a new session delegation
/// The owner authorizes a relayer to perform operations on their behalf
pub fn create_session_delegation(
    ctx: Context<CreateSessionDelegation>,
    allowed_operations: u8,
    duration: i64,
    max_operations: u32,
) -> Result<()> {
    let clock = Clock::get()?;
    let session = &mut ctx.accounts.session;
    let owner = ctx.accounts.owner.key();
    let relayer = ctx.accounts.relayer.key();

    // Use default duration if 0 provided
    let actual_duration = if duration == 0 {
        DEFAULT_SESSION_DURATION
    } else {
        duration
    };

    session.initialize(
        ctx.bumps.session,
        owner,
        relayer,
        allowed_operations,
        actual_duration,
        max_operations,
        clock.unix_timestamp,
    )?;

    emit!(SessionDelegationCreated {
        owner,
        relayer,
        session: session.key(),
        allowed_operations,
        expires_at: session.expires_at,
        max_operations,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Session delegation created: owner={}, relayer={}, expires_at={}",
        owner,
        relayer,
        session.expires_at
    );

    Ok(())
}

/// Revoke a session delegation immediately
/// The session becomes inactive but account remains for audit purposes
pub fn revoke_session(ctx: Context<RevokeSession>) -> Result<()> {
    let clock = Clock::get()?;
    let session = &mut ctx.accounts.session;

    session.revoke();

    emit!(SessionDelegationRevoked {
        owner: session.owner,
        relayer: session.relayer,
        session: session.key(),
        operations_used: session.operations_used,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Session delegation revoked: owner={}, relayer={}",
        session.owner,
        session.relayer
    );

    Ok(())
}

/// Extend the duration of an existing session
pub fn extend_session(ctx: Context<ExtendSession>, additional_duration: i64) -> Result<()> {
    let clock = Clock::get()?;
    let session = &mut ctx.accounts.session;

    let old_expiry = session.expires_at;
    session.extend(additional_duration, clock.unix_timestamp)?;

    emit!(SessionDelegationExtended {
        session: session.key(),
        old_expires_at: old_expiry,
        new_expires_at: session.expires_at,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Session extended: {} -> {}",
        old_expiry,
        session.expires_at
    );

    Ok(())
}

/// Close a session delegation and recover rent
/// Can only be done by owner, typically after session expires or is revoked
pub fn close_session(ctx: Context<CloseSession>) -> Result<()> {
    let session = &ctx.accounts.session;

    msg!(
        "Session closed: owner={}, relayer={}, operations_used={}",
        session.owner,
        session.relayer,
        session.operations_used
    );

    // Account will be closed automatically via `close = owner` constraint
    Ok(())
}

/// Validate that a session is active and can perform an operation
/// This is a helper instruction that can be called by relayers to check status
/// Returns true via program logs, or errors if invalid
pub fn validate_session(
    ctx: Context<ValidateSession>,
    operation: u8,
    expected_nonce: u64,
) -> Result<()> {
    let clock = Clock::get()?;
    let session = &ctx.accounts.session;

    // Check session is valid
    require!(
        session.is_valid(clock.unix_timestamp),
        BlockDriveError::DelegationExpired
    );

    // Check operation is permitted
    require!(
        session.can_perform(operation),
        BlockDriveError::InsufficientPermissions
    );

    // Check operation limit
    require!(
        session.has_remaining_operations(),
        BlockDriveError::DelegationNotActive
    );

    // Verify nonce
    require!(
        expected_nonce == session.nonce,
        BlockDriveError::InvalidCommitment
    );

    msg!(
        "Session valid: relayer={}, nonce={}, remaining_ops={}",
        session.relayer,
        session.nonce,
        session.remaining_operations()
    );

    Ok(())
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/// Derive the SessionDelegation PDA address
pub fn derive_session_pda(
    owner: &Pubkey,
    relayer: &Pubkey,
    program_id: &Pubkey,
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[
            SessionDelegation::SEED_PREFIX,
            owner.as_ref(),
            relayer.as_ref(),
        ],
        program_id,
    )
}
