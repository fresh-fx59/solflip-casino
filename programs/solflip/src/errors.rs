use anchor_lang::prelude::*;

#[error_code]
pub enum SolflipError {
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Bet is below the configured minimum")]
    BetTooSmall,
    #[msg("Bet is above the configured maximum")]
    BetTooLarge,
    #[msg("Insufficient casino balance — deposit more first")]
    InsufficientBalance,
    #[msg("House edge exceeds the allowed maximum")]
    EdgeTooHigh,
    #[msg("Coin side must be 0 (heads) or 1 (tails)")]
    InvalidSide,
    #[msg("The force seed must be non-zero (ORAO VRF requirement)")]
    ZeroForce,
    #[msg("House bankroll cannot currently cover this bet's potential payout")]
    InsufficientHouseBankroll,
    #[msg("Vault would drop below its rent-exempt + reserved minimum")]
    VaultInsolvent,
    #[msg("Randomness has not been fulfilled by the ORAO oracle yet")]
    RandomnessNotFulfilled,
    #[msg("This bet has already been settled")]
    BetAlreadySettled,
    #[msg("Only the house authority may perform this action")]
    Unauthorized,
}
