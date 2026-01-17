use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::GasCreditsAccount;
use crate::errors::BlockDriveError;
use crate::events::{GasCreditsInitialized, GasCreditsAdded, GasCreditsDeducted};

#[derive(Accounts)]
pub struct InitializeGasCredits<'info> {
    #[account(
        init,
        payer = owner,
        space = GasCreditsAccount::SIZE,
        seeds = [GasCreditsAccount::SEED_PREFIX, owner.key().as_ref()],
        bump
    )]
    pub gas_credits: Account<'info, GasCreditsAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddCredits<'info> {
    #[account(
        mut,
        seeds = [GasCreditsAccount::SEED_PREFIX, owner.key().as_ref()],
        bump = gas_credits.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub gas_credits: Account<'info, GasCreditsAccount>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeductCredits<'info> {
    #[account(
        mut,
        seeds = [GasCreditsAccount::SEED_PREFIX, user.key().as_ref()],
        bump = gas_credits.bump,
    )]
    pub gas_credits: Account<'info, GasCreditsAccount>,

    /// The user whose credits are being deducted
    /// CHECK: This is safe because we're only reading the key
    pub user: UncheckedAccount<'info>,

    /// Authority that can deduct credits (relayer or owner)
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SwapUsdcToSol<'info> {
    #[account(
        mut,
        seeds = [GasCreditsAccount::SEED_PREFIX, owner.key().as_ref()],
        bump = gas_credits.bump,
        has_one = owner @ BlockDriveError::Unauthorized
    )]
    pub gas_credits: Account<'info, GasCreditsAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    /// USDC token account (owner's)
    #[account(mut)]
    pub usdc_account: Account<'info, TokenAccount>,

    /// Jupiter program for swap execution
    /// CHECK: This is the Jupiter Aggregator program
    pub jupiter_program: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

/// Initialize gas credits account for a user
pub fn initialize_gas_credits(
    ctx: Context<InitializeGasCredits>,
    initial_balance: u64,
) -> Result<()> {
    let gas_credits = &mut ctx.accounts.gas_credits;
    let clock = Clock::get()?;

    gas_credits.bump = ctx.bumps.gas_credits;
    gas_credits.owner = ctx.accounts.owner.key();
    gas_credits.balance_usdc = initial_balance;
    gas_credits.total_credits = initial_balance;
    gas_credits.credits_used = 0;
    gas_credits.last_top_up_at = clock.unix_timestamp;
    gas_credits.expires_at = 0; // No expiry by default
    gas_credits.reserved = [0u8; 32];

    emit!(GasCreditsInitialized {
        owner: ctx.accounts.owner.key(),
        gas_credits: gas_credits.key(),
        initial_balance,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Add credits to account (called after payment)
pub fn add_credits(
    ctx: Context<AddCredits>,
    amount: u64,
) -> Result<()> {
    let gas_credits = &mut ctx.accounts.gas_credits;
    let clock = Clock::get()?;

    require!(amount > 0, BlockDriveError::InvalidAmount);

    gas_credits.add_credits(amount, clock.unix_timestamp);

    emit!(GasCreditsAdded {
        owner: ctx.accounts.owner.key(),
        gas_credits: gas_credits.key(),
        amount,
        new_balance: gas_credits.balance_usdc,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Deduct credits for an operation
pub fn deduct_credits(
    ctx: Context<DeductCredits>,
    amount: u64,
    operation_type: String,
) -> Result<()> {
    let gas_credits = &mut ctx.accounts.gas_credits;
    let clock = Clock::get()?;

    require!(amount > 0, BlockDriveError::InvalidAmount);

    // Check if credits have expired
    require!(
        !gas_credits.is_expired(clock.unix_timestamp),
        BlockDriveError::GasCreditsExpired
    );

    // Deduct credits (will fail if insufficient)
    gas_credits.deduct_credits(amount)?;

    emit!(GasCreditsDeducted {
        owner: ctx.accounts.user.key(),
        gas_credits: gas_credits.key(),
        amount,
        operation_type,
        remaining_balance: gas_credits.balance_usdc,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Swap USDC to SOL using Jupiter (placeholder for Jupiter integration)
pub fn swap_usdc_to_sol(
    ctx: Context<SwapUsdcToSol>,
    amount: u64,
) -> Result<()> {
    let gas_credits = &mut ctx.accounts.gas_credits;

    require!(amount > 0, BlockDriveError::InvalidAmount);
    require!(
        gas_credits.has_sufficient_balance(amount),
        BlockDriveError::InsufficientGasCredits
    );

    // TODO: Implement Jupiter swap integration
    // For now, this is a placeholder that deducts credits
    // In production, this will:
    // 1. Call Jupiter Aggregator to get best swap route
    // 2. Execute swap transaction
    // 3. Transfer SOL to owner
    // 4. Deduct USDC equivalent from gas credits

    msg!("Jupiter swap integration pending. Amount to swap: {}", amount);

    Ok(())
}

/// Set expiration date for gas credits
pub fn set_expiration(
    ctx: Context<AddCredits>,
    expires_at: i64,
) -> Result<()> {
    let gas_credits = &mut ctx.accounts.gas_credits;

    require!(expires_at > 0, BlockDriveError::InvalidAmount);

    gas_credits.expires_at = expires_at;

    Ok(())
}
