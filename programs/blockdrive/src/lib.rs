use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;
pub mod events;
pub mod transfer_hook;

use instructions::*;
use transfer_hook::*;

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

    // =========================================================================
    // GAS CREDITS INSTRUCTIONS
    // =========================================================================

    /// Initialize gas credits account for a user
    ///
    /// Creates a GasCreditsAccount PDA to track USDC balance for gas fees.
    ///
    /// # Arguments
    /// * `initial_balance` - Initial USDC balance in lamports (6 decimals)
    pub fn initialize_gas_credits(
        ctx: Context<InitializeGasCredits>,
        initial_balance: u64,
    ) -> Result<()> {
        instructions::gas_credits::initialize_gas_credits(ctx, initial_balance)
    }

    /// Add credits to a gas credits account
    ///
    /// Called after a user makes a payment to add credits.
    ///
    /// # Arguments
    /// * `amount` - Amount of USDC to add (in lamports, 6 decimals)
    pub fn add_credits(ctx: Context<AddCredits>, amount: u64) -> Result<()> {
        instructions::gas_credits::add_credits(ctx, amount)
    }

    /// Deduct credits for an operation
    ///
    /// Called by relayer or owner when executing gasless operations.
    ///
    /// # Arguments
    /// * `amount` - Amount of USDC to deduct (in lamports)
    /// * `operation_type` - Type of operation (e.g., "register_file", "update_file")
    pub fn deduct_credits(
        ctx: Context<DeductCredits>,
        amount: u64,
        operation_type: String,
    ) -> Result<()> {
        instructions::gas_credits::deduct_credits(ctx, amount, operation_type)
    }

    /// Swap USDC to SOL using Jupiter
    ///
    /// Converts gas credits (USDC) to SOL for transaction fees.
    ///
    /// # Arguments
    /// * `amount` - Amount of USDC to swap (in lamports)
    pub fn swap_usdc_to_sol(ctx: Context<SwapUsdcToSol>, amount: u64) -> Result<()> {
        instructions::gas_credits::swap_usdc_to_sol(ctx, amount)
    }

    /// Set expiration date for gas credits
    ///
    /// # Arguments
    /// * `expires_at` - Unix timestamp when credits expire (0 = no expiry)
    pub fn set_gas_credits_expiration(ctx: Context<AddCredits>, expires_at: i64) -> Result<()> {
        instructions::gas_credits::set_expiration(ctx, expires_at)
    }

    // =========================================================================
    // MEMBERSHIP INSTRUCTIONS
    // =========================================================================

    /// Create a new membership link connecting wallet -> SNS domain -> NFT
    ///
    /// This creates the MembershipLink PDA and optionally mints a soulbound
    /// membership NFT to the wallet.
    ///
    /// # Arguments
    /// * `sns_domain` - The SNS domain to link (without .sol suffix)
    /// * `mint_nft` - Whether to mint the soulbound NFT in this transaction
    ///
    /// # Security
    /// - Only the wallet owner can create their membership link
    /// - The NFT uses Token-2022 Transfer Hook for soulbound enforcement
    pub fn create_membership_link(
        ctx: Context<CreateMembershipLink>,
        sns_domain: String,
        mint_nft: bool,
    ) -> Result<()> {
        instructions::membership::create_membership_link(ctx, sns_domain, mint_nft)
    }

    /// Update an existing membership link
    ///
    /// Allows updating the SNS domain or NFT mint reference.
    ///
    /// # Arguments
    /// * `sns_domain` - Optional new SNS domain
    /// * `update_nft_mint` - Whether to update to new_nft_mint account
    pub fn update_membership_link(
        ctx: Context<UpdateMembershipLink>,
        sns_domain: Option<String>,
        update_nft_mint: bool,
    ) -> Result<()> {
        instructions::membership::update_membership_link(ctx, sns_domain, update_nft_mint)
    }

    /// Deactivate a membership link without deletion
    ///
    /// Preserves the record for historical purposes but marks as inactive.
    pub fn deactivate_membership_link(ctx: Context<DeactivateMembershipLink>) -> Result<()> {
        instructions::membership::deactivate_membership_link(ctx)
    }

    /// Reactivate a previously deactivated membership link
    pub fn reactivate_membership_link(ctx: Context<ReactivateMembershipLink>) -> Result<()> {
        instructions::membership::reactivate_membership_link(ctx)
    }

    /// Voluntarily burn a membership NFT
    ///
    /// This destroys the soulbound NFT and deactivates the membership link.
    pub fn burn_membership_nft(ctx: Context<BurnMembershipNft>) -> Result<()> {
        instructions::membership::burn_membership_nft(ctx)
    }

    // =========================================================================
    // TRANSFER HOOK INSTRUCTIONS
    // =========================================================================

    /// Initialize the extra account metas for the transfer hook
    ///
    /// This must be called before the mint can process transfers.
    /// It sets up the PDA that tells Token-2022 which accounts to pass
    /// to our transfer hook.
    pub fn initialize_transfer_hook(ctx: Context<InitializeExtraAccountMetas>) -> Result<()> {
        transfer_hook::initialize_extra_account_metas(ctx)
    }

    /// Execute the transfer hook (called by Token-2022)
    ///
    /// This is the core soulbound enforcement logic:
    /// - Allows minting (new NFTs)
    /// - Allows burning (voluntary destruction)
    /// - BLOCKS all other transfers
    ///
    /// # Security
    /// - This function is called automatically by Token-2022
    /// - Unauthorized transfers are blocked and logged
    pub fn execute_transfer_hook(ctx: Context<ExecuteTransferHook>, amount: u64) -> Result<()> {
        transfer_hook::execute_transfer_hook(ctx, amount)
    }

    /// Toggle the transfer hook on/off (admin only)
    ///
    /// WARNING: Disabling the hook removes soulbound enforcement!
    /// This should only be used in emergencies.
    pub fn toggle_transfer_hook(ctx: Context<ToggleTransferHook>, enabled: bool) -> Result<()> {
        transfer_hook::toggle_transfer_hook(ctx, enabled)
    }
}
