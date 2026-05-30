use anchor_lang::prelude::*;

/// Global casino configuration + accounting. One per program. PDA: [b"house"].
///
/// Solvency invariant (checked on every state-changing instruction):
///   vault.lamports >= vault_rent_exempt + total_liabilities + locked
///
/// - `total_liabilities` = sum of every player's withdrawable balance.
/// - `locked`            = sum, over all *pending* bets, of the full potential
///                         payout. Locking the max payout at bet time is what
///                         guarantees the house can always pay a winner.
#[account]
#[derive(InitSpace)]
pub struct House {
    pub authority: Pubkey,
    pub bump: u8,
    pub vault_bump: u8,
    /// House edge in basis points (e.g. 200 = 2%).
    pub edge_bps: u16,
    pub min_bet: u64,
    pub max_bet: u64,
    /// Sum of all players' withdrawable balances.
    pub total_liabilities: u64,
    /// Sum of potential payouts locked by currently-pending bets.
    pub locked: u64,
    // ---- lifetime stats (for transparency / the UI) ----
    pub total_bets: u64,
    pub total_settled: u64,
    pub total_wagered: u64,
    pub total_paid_out: u64,
}

/// Holds all pooled lamports. PDA: [b"vault"]. Program-owned so the program can
/// pay winners by direct lamport manipulation; funded by deposits + house seed.
#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub bump: u8,
}

/// Per-user ledger. PDA: [b"player", user]. `balance` is the user's withdrawable
/// claim on the vault; `nonce` is a monotonically increasing bet counter.
#[account]
#[derive(InitSpace)]
pub struct Player {
    pub owner: Pubkey,
    pub bump: u8,
    pub balance: u64,
    pub nonce: u64,
    pub total_bets: u64,
    pub wins: u64,
    pub losses: u64,
    pub total_wagered: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BetStatus {
    Pending,
    Won,
    Lost,
}

/// One bet. PDA: [b"bet", user, &force]. Created at `place_bet`, closed at
/// `settle_bet` (rent returned to the player). The `place_bet` / `settle_bet`
/// transactions and the ORAO randomness account remain on-chain forever, so the
/// bet is fully verifiable even after this account is closed.
#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub player: Pubkey,
    pub nonce: u64,
    /// Stake, in lamports.
    pub amount: u64,
    /// Chosen side: 0 = heads, 1 = tails.
    pub side: u8,
    /// 32-byte VRF seed; also the seed of the ORAO randomness account.
    pub force: [u8; 32],
    /// Full potential payout locked for this bet (stake * win-multiplier).
    pub potential_payout: u64,
    pub status: BetStatus,
    pub slot_placed: u64,
}
