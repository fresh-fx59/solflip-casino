use anchor_lang::prelude::*;

/// PDA seeds.
#[constant]
pub const HOUSE_SEED: &[u8] = b"house";
#[constant]
pub const VAULT_SEED: &[u8] = b"vault";
#[constant]
pub const PLAYER_SEED: &[u8] = b"player";
#[constant]
pub const BET_SEED: &[u8] = b"bet";

/// Basis-point denominator (100% = 10_000 bps).
pub const BPS_DENOMINATOR: u64 = 10_000;

/// A coin flip is 50/50; a fair win pays 2x. The house edge lives entirely in
/// the payout multiplier: win pays `2 * (1 - edge)`.
///   edge_bps = 200 (2%)  ->  payout = stake * 1.96
pub const FAIR_MULTIPLIER_BPS: u64 = 20_000; // 2.0000x in bps

/// Hard ceiling on edge so the house can never be configured into a rug
/// (e.g. a "win pays 0" trap). 1000 bps = 10% max edge.
pub const MAX_EDGE_BPS: u16 = 1_000;
