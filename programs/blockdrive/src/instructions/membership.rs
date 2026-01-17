use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{self, Token2022, MintTo, Burn},
    token_interface::{Mint, TokenAccount},
    associated_token::AssociatedToken,
};

use crate::state::{MembershipLink, MembershipLinkError, MAX_SNS_DOMAIN_LENGTH};
use crate::events::{
    MembershipLinkCreated,
    MembershipLinkUpdated,
    MembershipLinkDeactivated,
    MembershipNftMinted,
    MembershipNftBurned,
};

/// Program authority seeds for signing
pub const AUTHORITY_SEED: &[u8] = b"authority";

// ============================================================================
// CREATE MEMBERSHIP LINK
// ============================================================================

/// Accounts required to create a new membership link
///
/// This instruction:
/// 1. Creates a MembershipLink PDA linking wallet -> SNS domain -> NFT mint
/// 2. Optionally mints a soulbound membership NFT to the wallet
///
/// # Security
/// - Only the wallet owner can create their own membership link
/// - The membership link PDA is derived from the wallet address
/// - NFT minting requires the mint authority to be the program PDA
#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct CreateMembershipLink<'info> {
    /// The MembershipLink PDA to create
    /// Seeds: ["membership_link", wallet.key()]
    #[account(
        init,
        payer = wallet,
        space = MembershipLink::SIZE,
        seeds = [MembershipLink::SEED_PREFIX, wallet.key().as_ref()],
        bump
    )]
    pub membership_link: Account<'info, MembershipLink>,

    /// The wallet creating the membership link (must sign)
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// The NFT mint account for the soulbound membership token
    /// This must be a Token-2022 mint with Transfer Hook extension configured
    /// The program authority must be the mint authority
    #[account(
        mint::token_program = token_program,
    )]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    /// The wallet's associated token account for the NFT
    /// Will receive the minted membership NFT
    #[account(
        init_if_needed,
        payer = wallet,
        associated_token::mint = nft_mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub wallet_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Program authority PDA - must be mint authority for the NFT
    /// Seeds: ["authority"]
    #[account(
        seeds = [AUTHORITY_SEED],
        bump,
    )]
    pub program_authority: SystemAccount<'info>,

    /// Token-2022 program for NFT operations
    pub token_program: Program<'info, Token2022>,

    /// Associated Token Program for creating ATAs
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Create a new membership link with optional NFT minting
///
/// # Arguments
/// * `ctx` - The instruction context
/// * `sns_domain` - The SNS domain to link (without .sol suffix)
/// * `mint_nft` - Whether to mint the soulbound NFT in this transaction
///
/// # Errors
/// - `InvalidSnsDomain` - If the domain format is invalid
/// - Token errors if NFT minting fails
pub fn create_membership_link(
    ctx: Context<CreateMembershipLink>,
    sns_domain: String,
    mint_nft: bool,
) -> Result<()> {
    // Validate SNS domain
    require!(
        MembershipLink::validate_sns_domain(&sns_domain),
        MembershipLinkError::InvalidSnsDomain
    );

    let clock = Clock::get()?;
    let membership_link = &mut ctx.accounts.membership_link;

    // Initialize the membership link
    membership_link.bump = ctx.bumps.membership_link;
    membership_link.wallet = ctx.accounts.wallet.key();
    membership_link.sns_domain = sns_domain.clone();
    membership_link.nft_mint = ctx.accounts.nft_mint.key();
    membership_link.created_at = clock.unix_timestamp;
    membership_link.updated_at = clock.unix_timestamp;
    membership_link.is_active = true;
    membership_link.reserved = [0u8; 64];

    // Mint the soulbound NFT if requested
    if mint_nft {
        let authority_bump = ctx.bumps.program_authority;
        let authority_seeds = &[AUTHORITY_SEED, &[authority_bump]];
        let signer_seeds = &[&authority_seeds[..]];

        // Mint exactly 1 NFT to the wallet's token account
        let cpi_accounts = MintTo {
            mint: ctx.accounts.nft_mint.to_account_info(),
            to: ctx.accounts.wallet_token_account.to_account_info(),
            authority: ctx.accounts.program_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token_2022::mint_to(cpi_ctx, 1)?;

        emit!(MembershipNftMinted {
            wallet: ctx.accounts.wallet.key(),
            nft_mint: ctx.accounts.nft_mint.key(),
            timestamp: clock.unix_timestamp,
        });
    }

    emit!(MembershipLinkCreated {
        wallet: ctx.accounts.wallet.key(),
        membership_link: membership_link.key(),
        sns_domain,
        nft_mint: ctx.accounts.nft_mint.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================================================
// UPDATE MEMBERSHIP LINK
// ============================================================================

/// Accounts required to update an existing membership link
#[derive(Accounts)]
pub struct UpdateMembershipLink<'info> {
    /// The MembershipLink PDA to update
    #[account(
        mut,
        seeds = [MembershipLink::SEED_PREFIX, wallet.key().as_ref()],
        bump = membership_link.bump,
        has_one = wallet @ MembershipLinkError::WalletMismatch,
    )]
    pub membership_link: Account<'info, MembershipLink>,

    /// The wallet owner (must sign)
    pub wallet: Signer<'info>,

    /// Optional: New NFT mint if changing the membership NFT
    /// Only required if updating the NFT mint
    #[account(
        mint::token_program = token_program,
    )]
    pub new_nft_mint: Option<InterfaceAccount<'info, Mint>>,

    /// Token-2022 program (required if new_nft_mint is provided)
    pub token_program: Program<'info, Token2022>,
}

/// Update an existing membership link
///
/// # Arguments
/// * `ctx` - The instruction context
/// * `sns_domain` - Optional new SNS domain
/// * `update_nft_mint` - Whether to update the NFT mint to new_nft_mint
///
/// # Security
/// - Only the wallet owner can update their membership link
/// - The membership link must be active
pub fn update_membership_link(
    ctx: Context<UpdateMembershipLink>,
    sns_domain: Option<String>,
    update_nft_mint: bool,
) -> Result<()> {
    let membership_link = &mut ctx.accounts.membership_link;
    let clock = Clock::get()?;

    // Ensure membership link is active
    require!(
        membership_link.is_active,
        MembershipLinkError::MembershipLinkInactive
    );

    // Validate and update SNS domain if provided
    if let Some(ref domain) = sns_domain {
        require!(
            MembershipLink::validate_sns_domain(domain),
            MembershipLinkError::InvalidSnsDomain
        );
        membership_link.sns_domain = domain.clone();
    }

    // Update NFT mint if requested and new mint is provided
    if update_nft_mint {
        require!(
            ctx.accounts.new_nft_mint.is_some(),
            MembershipLinkError::InvalidNftMint
        );
        membership_link.nft_mint = ctx.accounts.new_nft_mint.as_ref().unwrap().key();
    }

    membership_link.updated_at = clock.unix_timestamp;

    emit!(MembershipLinkUpdated {
        wallet: ctx.accounts.wallet.key(),
        membership_link: membership_link.key(),
        sns_domain: membership_link.sns_domain.clone(),
        nft_mint: membership_link.nft_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================================================
// DEACTIVATE MEMBERSHIP LINK
// ============================================================================

/// Accounts required to deactivate a membership link
#[derive(Accounts)]
pub struct DeactivateMembershipLink<'info> {
    /// The MembershipLink PDA to deactivate
    #[account(
        mut,
        seeds = [MembershipLink::SEED_PREFIX, wallet.key().as_ref()],
        bump = membership_link.bump,
        has_one = wallet @ MembershipLinkError::WalletMismatch,
    )]
    pub membership_link: Account<'info, MembershipLink>,

    /// The wallet owner (must sign)
    pub wallet: Signer<'info>,
}

/// Deactivate a membership link without deletion
///
/// This preserves the record for historical purposes but marks it as inactive.
/// The wallet can reactivate later if desired.
///
/// # Security
/// - Only the wallet owner can deactivate their membership link
/// - The membership link must currently be active
pub fn deactivate_membership_link(ctx: Context<DeactivateMembershipLink>) -> Result<()> {
    let membership_link = &mut ctx.accounts.membership_link;
    let clock = Clock::get()?;

    // Ensure membership link is currently active
    require!(
        membership_link.is_active,
        MembershipLinkError::MembershipLinkInactive
    );

    membership_link.deactivate(clock.unix_timestamp);

    emit!(MembershipLinkDeactivated {
        wallet: ctx.accounts.wallet.key(),
        membership_link: membership_link.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================================================
// REACTIVATE MEMBERSHIP LINK
// ============================================================================

/// Accounts required to reactivate a membership link
#[derive(Accounts)]
pub struct ReactivateMembershipLink<'info> {
    /// The MembershipLink PDA to reactivate
    #[account(
        mut,
        seeds = [MembershipLink::SEED_PREFIX, wallet.key().as_ref()],
        bump = membership_link.bump,
        has_one = wallet @ MembershipLinkError::WalletMismatch,
    )]
    pub membership_link: Account<'info, MembershipLink>,

    /// The wallet owner (must sign)
    pub wallet: Signer<'info>,
}

/// Reactivate a previously deactivated membership link
pub fn reactivate_membership_link(ctx: Context<ReactivateMembershipLink>) -> Result<()> {
    let membership_link = &mut ctx.accounts.membership_link;
    let clock = Clock::get()?;

    // Ensure membership link is currently inactive
    require!(
        !membership_link.is_active,
        MembershipLinkError::MembershipLinkAlreadyActive
    );

    membership_link.reactivate(clock.unix_timestamp);

    emit!(MembershipLinkUpdated {
        wallet: ctx.accounts.wallet.key(),
        membership_link: membership_link.key(),
        sns_domain: membership_link.sns_domain.clone(),
        nft_mint: membership_link.nft_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================================================
// BURN MEMBERSHIP NFT (Voluntary)
// ============================================================================

/// Accounts required to voluntarily burn a membership NFT
#[derive(Accounts)]
pub struct BurnMembershipNft<'info> {
    /// The MembershipLink PDA
    #[account(
        mut,
        seeds = [MembershipLink::SEED_PREFIX, wallet.key().as_ref()],
        bump = membership_link.bump,
        has_one = wallet @ MembershipLinkError::WalletMismatch,
    )]
    pub membership_link: Account<'info, MembershipLink>,

    /// The wallet owner burning their NFT (must sign)
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// The NFT mint to burn from
    #[account(
        mut,
        address = membership_link.nft_mint @ MembershipLinkError::NftMintMismatch,
    )]
    pub nft_mint: InterfaceAccount<'info, Mint>,

    /// The wallet's token account holding the NFT
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = wallet,
        associated_token::token_program = token_program,
    )]
    pub wallet_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Token-2022 program
    pub token_program: Program<'info, Token2022>,
}

/// Voluntarily burn a membership NFT
///
/// This allows a member to destroy their soulbound NFT.
/// The membership link will be deactivated as a result.
///
/// # Security
/// - Only the NFT holder can burn their own NFT
/// - This is the only authorized way to destroy a membership NFT
///   (besides the Transfer Hook auto-burn on unauthorized transfer)
pub fn burn_membership_nft(ctx: Context<BurnMembershipNft>) -> Result<()> {
    let clock = Clock::get()?;

    // Burn the NFT
    let cpi_accounts = Burn {
        mint: ctx.accounts.nft_mint.to_account_info(),
        from: ctx.accounts.wallet_token_account.to_account_info(),
        authority: ctx.accounts.wallet.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    token_2022::burn(cpi_ctx, 1)?;

    // Deactivate the membership link
    let membership_link = &mut ctx.accounts.membership_link;
    membership_link.deactivate(clock.unix_timestamp);
    membership_link.nft_mint = Pubkey::default(); // Clear the mint reference

    emit!(MembershipNftBurned {
        wallet: ctx.accounts.wallet.key(),
        nft_mint: ctx.accounts.nft_mint.key(),
        reason: BurnReason::VoluntaryBurn,
        timestamp: clock.unix_timestamp,
    });

    emit!(MembershipLinkDeactivated {
        wallet: ctx.accounts.wallet.key(),
        membership_link: membership_link.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Reason for NFT burn
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum BurnReason {
    /// User voluntarily burned their NFT
    VoluntaryBurn = 0,
    /// Transfer Hook auto-burned on unauthorized transfer attempt
    TransferAttempt = 1,
    /// Administrative burn (e.g., TOS violation)
    Administrative = 2,
}
