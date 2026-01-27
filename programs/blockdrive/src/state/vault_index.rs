use anchor_lang::prelude::*;

/// Maximum entries in the index (supports 1000 files)
/// Each entry is 17 bytes (16 byte file_id + 1 byte shard_index)
pub const MAX_INDEX_ENTRIES: usize = 1000;

/// Single index entry mapping file_id to shard location
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, PartialEq)]
pub struct IndexEntry {
    /// Unique file identifier (UUID bytes)
    pub file_id: [u8; 16],
    /// Shard index where this file lives (0-9)
    pub shard_index: u8,
    /// Slot index within the shard (0-99)
    pub slot_index: u8,
}

impl IndexEntry {
    pub const SIZE: usize = 16 + 1 + 1; // file_id + shard_index + slot_index

    pub fn new(file_id: [u8; 16], shard_index: u8, slot_index: u8) -> Self {
        Self {
            file_id,
            shard_index,
            slot_index,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.file_id == [0u8; 16]
    }
}

/// UserVaultIndex PDA - The "Lookup Table" for fast file location queries
/// Maps file_id -> (shard_index, slot_index) for O(1) lookups
/// Seeds: ["vault_index", vault_master_pubkey]
#[account]
pub struct UserVaultIndex {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Parent vault master pubkey
    pub vault_master: Pubkey,

    /// Owner's wallet pubkey (denormalized for efficient queries)
    pub owner: Pubkey,

    /// Number of entries currently in the index
    pub entry_count: u16,

    /// Index creation timestamp
    pub created_at: i64,

    /// Last activity timestamp
    pub updated_at: i64,

    /// Dynamic array of index entries
    /// Note: In production, consider using a more efficient data structure
    /// or off-chain indexing for larger file counts
    pub entries: Vec<IndexEntry>,

    /// Reserved for future use
    pub reserved: [u8; 32],
}

impl UserVaultIndex {
    /// Base account size (without dynamic entries)
    pub const BASE_SIZE: usize = 8 +   // discriminator
        1 +                             // bump
        32 +                            // vault_master
        32 +                            // owner
        2 +                             // entry_count
        8 +                             // created_at
        8 +                             // updated_at
        4 +                             // vec length prefix
        32;                             // reserved

    /// Maximum account size with all entries
    pub const MAX_SIZE: usize = Self::BASE_SIZE + (IndexEntry::SIZE * MAX_INDEX_ENTRIES);

    /// Seeds for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"vault_index";

    /// Initialize a new index
    pub fn initialize(
        &mut self,
        bump: u8,
        vault_master: Pubkey,
        owner: Pubkey,
        timestamp: i64,
    ) {
        self.bump = bump;
        self.vault_master = vault_master;
        self.owner = owner;
        self.entry_count = 0;
        self.created_at = timestamp;
        self.updated_at = timestamp;
        self.entries = Vec::with_capacity(100); // Start with reasonable capacity
        self.reserved = [0u8; 32];
    }

    /// Add a file to the index
    pub fn add_entry(
        &mut self,
        file_id: [u8; 16],
        shard_index: u8,
        slot_index: u8,
        timestamp: i64,
    ) -> Result<()> {
        require!(
            (self.entry_count as usize) < MAX_INDEX_ENTRIES,
            IndexError::IndexFull
        );

        // Check for duplicate file_id
        require!(
            self.find_entry(&file_id).is_none(),
            IndexError::DuplicateFileId
        );

        let entry = IndexEntry::new(file_id, shard_index, slot_index);
        self.entries.push(entry);
        self.entry_count = self.entry_count.saturating_add(1);
        self.updated_at = timestamp;

        Ok(())
    }

    /// Remove a file from the index
    pub fn remove_entry(&mut self, file_id: &[u8; 16], timestamp: i64) -> Result<()> {
        let position = self.entries.iter().position(|e| &e.file_id == file_id);

        match position {
            Some(index) => {
                self.entries.swap_remove(index); // O(1) removal
                self.entry_count = self.entry_count.saturating_sub(1);
                self.updated_at = timestamp;
                Ok(())
            }
            None => Err(IndexError::FileNotFound.into()),
        }
    }

    /// Find entry by file_id - returns (shard_index, slot_index)
    pub fn find_entry(&self, file_id: &[u8; 16]) -> Option<(u8, u8)> {
        self.entries
            .iter()
            .find(|e| &e.file_id == file_id)
            .map(|e| (e.shard_index, e.slot_index))
    }

    /// Get all entries for a specific shard
    pub fn get_entries_for_shard(&self, shard_index: u8) -> Vec<&IndexEntry> {
        self.entries
            .iter()
            .filter(|e| e.shard_index == shard_index)
            .collect()
    }

    /// Update entry location (for rebalancing)
    pub fn update_entry(
        &mut self,
        file_id: &[u8; 16],
        new_shard_index: u8,
        new_slot_index: u8,
        timestamp: i64,
    ) -> Result<()> {
        let entry = self
            .entries
            .iter_mut()
            .find(|e| &e.file_id == file_id)
            .ok_or(IndexError::FileNotFound)?;

        entry.shard_index = new_shard_index;
        entry.slot_index = new_slot_index;
        self.updated_at = timestamp;

        Ok(())
    }

    /// Check if index has capacity for more entries
    pub fn has_capacity(&self) -> bool {
        (self.entry_count as usize) < MAX_INDEX_ENTRIES
    }

    /// Get count of files in a specific shard
    pub fn count_files_in_shard(&self, shard_index: u8) -> u16 {
        self.entries
            .iter()
            .filter(|e| e.shard_index == shard_index)
            .count() as u16
    }
}

impl Default for UserVaultIndex {
    fn default() -> Self {
        Self {
            bump: 0,
            vault_master: Pubkey::default(),
            owner: Pubkey::default(),
            entry_count: 0,
            created_at: 0,
            updated_at: 0,
            entries: Vec::new(),
            reserved: [0u8; 32],
        }
    }
}

/// Custom error codes for index operations
#[error_code]
pub enum IndexError {
    #[msg("Index is full, maximum 1000 files supported")]
    IndexFull,
    #[msg("File ID already exists in index")]
    DuplicateFileId,
    #[msg("File not found in index")]
    FileNotFound,
}
