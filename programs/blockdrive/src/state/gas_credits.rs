use anchor_lang::prelude::*;

/// GasCreditsAccount PDA - stores user's gas credits balance in USDC
/// Seeds: ["gas_credits", owner_pubkey]
#[account]
#[derive(Default)]
pub struct GasCreditsAccount {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Owner's wallet public key
    pub owner: Pubkey,

    /// USDC balance in lamports (6 decimals)
    /// 1 USDC = 1_000_000 lamports
    pub balance_usdc: u64,

    /// Total credits ever added (lifetime)
    pub total_credits: u64,

    /// Total credits consumed (lifetime)
    pub credits_used: u64,

    /// Timestamp of last credit addition
    pub last_top_up_at: i64,

    /// Expiration timestamp (0 = no expiry)
    pub expires_at: i64,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl GasCreditsAccount {
    /// Account size for rent calculation
    pub const SIZE: usize = 8 +  // discriminator
        1 +   // bump
        32 +  // owner
        8 +   // balance_usdc
        8 +   // total_credits
        8 +   // credits_used
        8 +   // last_top_up_at
        8 +   // expires_at
        32;   // reserved

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"gas_credits";

    /// Check if account has expired
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        self.expires_at > 0 && current_timestamp > self.expires_at
    }

    /// Check if account has sufficient balance
    pub fn has_sufficient_balance(&self, amount: u64) -> bool {
        self.balance_usdc >= amount
    }

    /// Add credits to account
    pub fn add_credits(&mut self, amount: u64, timestamp: i64) {
        self.balance_usdc = self.balance_usdc.saturating_add(amount);
        self.total_credits = self.total_credits.saturating_add(amount);
        self.last_top_up_at = timestamp;
    }

    /// Deduct credits from account
    /// Returns error if insufficient balance
    pub fn deduct_credits(&mut self, amount: u64) -> Result<()> {
        require!(
            self.balance_usdc >= amount,
            ErrorCode::InsufficientGasCredits
        );

        self.balance_usdc = self.balance_usdc.saturating_sub(amount);
        self.credits_used = self.credits_used.saturating_add(amount);

        Ok(())
    }

    /// Get remaining balance
    pub fn get_balance(&self) -> u64 {
        self.balance_usdc
    }

    /// Calculate usage percentage
    pub fn usage_percentage(&self) -> u64 {
        if self.total_credits == 0 {
            return 0;
        }
        (self.credits_used * 100) / self.total_credits
    }
}

/// Error codes specific to gas credits
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient gas credits balance")]
    InsufficientGasCredits,
}
