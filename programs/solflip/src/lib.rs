//! SolFlip — a provably-fair coin-flip casino on Solana.
//!
//! Randomness is supplied by the ORAO VRF program (an external oracle this
//! program does not control), so neither the house nor the player can bias an
//! outcome. The full bet lifecycle is on-chain and verifiable on any explorer.
//!
//! Money model: all lamports live in a single program-owned `Vault` PDA. Each
//! player has an internal `balance` (a withdrawable claim on the vault). Bets
//! only move the internal ledger; real lamports move only on deposit/withdraw.
//! A solvency invariant guarantees the vault can always pay every claim and
//! every pending bet's maximum payout.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
use anchor_lang::AccountDeserialize;

use orao_solana_vrf::cpi::accounts::RequestV2;
use orao_solana_vrf::program::OraoVrf;
use orao_solana_vrf::state::{NetworkState, RandomnessAccountData};
use orao_solana_vrf::{CONFIG_ACCOUNT_SEED, RANDOMNESS_ACCOUNT_SEED};

pub mod constants;
pub mod errors;
pub mod state;

use constants::*;
use errors::SolflipError;
use state::*;

declare_id!("AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB");

#[program]
pub mod solflip {
    use super::*;

    /// One-time setup. Creates the `House` config and the pooled `Vault`.
    pub fn initialize_house(
        ctx: Context<InitializeHouse>,
        edge_bps: u16,
        min_bet: u64,
        max_bet: u64,
    ) -> Result<()> {
        require!(edge_bps <= MAX_EDGE_BPS, SolflipError::EdgeTooHigh);
        require!(min_bet > 0 && max_bet >= min_bet, SolflipError::ZeroAmount);

        let house = &mut ctx.accounts.house;
        house.authority = ctx.accounts.authority.key();
        house.bump = ctx.bumps.house;
        house.vault_bump = ctx.bumps.vault;
        house.edge_bps = edge_bps;
        house.min_bet = min_bet;
        house.max_bet = max_bet;
        house.total_liabilities = 0;
        house.locked = 0;
        house.total_bets = 0;
        house.total_settled = 0;
        house.total_wagered = 0;
        house.total_paid_out = 0;

        ctx.accounts.vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// Authority-only config update (min/max bet, edge).
    pub fn set_config(
        ctx: Context<SetConfig>,
        edge_bps: u16,
        min_bet: u64,
        max_bet: u64,
    ) -> Result<()> {
        require!(edge_bps <= MAX_EDGE_BPS, SolflipError::EdgeTooHigh);
        require!(min_bet > 0 && max_bet >= min_bet, SolflipError::ZeroAmount);
        let house = &mut ctx.accounts.house;
        house.edge_bps = edge_bps;
        house.min_bet = min_bet;
        house.max_bet = max_bet;
        Ok(())
    }

    /// Add bankroll to the vault. Permissionless: the deployer (or anyone) can
    /// top up the house bankroll. Funds added here are *not* a player liability;
    /// they are the equity that lets the house pay winners.
    pub fn fund_treasury(ctx: Context<FundTreasury>, amount: u64) -> Result<()> {
        require!(amount > 0, SolflipError::ZeroAmount);
        let cpi = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.funder.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi, amount)?;
        Ok(())
    }

    /// Deposit SOL into the casino. Moves real lamports user -> vault and
    /// credits the player's internal balance.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, SolflipError::ZeroAmount);

        let cpi = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.player.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        system_program::transfer(cpi, amount)?;

        let player = &mut ctx.accounts.player_account;
        if player.owner == Pubkey::default() {
            player.owner = ctx.accounts.player.key();
            player.bump = ctx.bumps.player_account;
        }
        player.balance = player.balance.checked_add(amount).ok_or(SolflipError::MathOverflow)?;

        let house = &mut ctx.accounts.house;
        house.total_liabilities = house
            .total_liabilities
            .checked_add(amount)
            .ok_or(SolflipError::MathOverflow)?;

        emit!(Deposited {
            player: ctx.accounts.player.key(),
            amount,
            new_balance: player.balance,
        });
        Ok(())
    }

    /// Withdraw from the casino balance back to the wallet. Moves real lamports
    /// vault -> user via direct lamport debit (the vault is program-owned).
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, SolflipError::ZeroAmount);

        let player = &mut ctx.accounts.player_account;
        require!(player.balance >= amount, SolflipError::InsufficientBalance);
        player.balance = player.balance.checked_sub(amount).ok_or(SolflipError::MathOverflow)?;

        let house = &mut ctx.accounts.house;
        house.total_liabilities = house
            .total_liabilities
            .checked_sub(amount)
            .ok_or(SolflipError::MathOverflow)?;

        // Direct lamport transfer out of the program-owned vault.
        let vault_ai = ctx.accounts.vault.to_account_info();
        let dest_ai = ctx.accounts.player.to_account_info();
        let new_vault = vault_ai.lamports().checked_sub(amount).ok_or(SolflipError::MathOverflow)?;
        let new_dest = dest_ai.lamports().checked_add(amount).ok_or(SolflipError::MathOverflow)?;
        **vault_ai.try_borrow_mut_lamports()? = new_vault;
        **dest_ai.try_borrow_mut_lamports()? = new_dest;

        assert_solvent(house, &vault_ai)?;

        emit!(Withdrawn {
            player: ctx.accounts.player.key(),
            amount,
            new_balance: player.balance,
        });
        Ok(())
    }

    /// Place a coin-flip bet. Escrows the stake from the player's balance,
    /// records the bet, and requests fresh randomness from ORAO VRF via CPI.
    /// The outcome is NOT known in this transaction.
    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, side: u8, force: [u8; 32]) -> Result<()> {
        require!(side <= 1, SolflipError::InvalidSide);
        require!(force != [0u8; 32], SolflipError::ZeroForce);

        let house = &mut ctx.accounts.house;
        require!(amount >= house.min_bet, SolflipError::BetTooSmall);
        require!(amount <= house.max_bet, SolflipError::BetTooLarge);

        let player = &mut ctx.accounts.player_account;
        require!(player.balance >= amount, SolflipError::InsufficientBalance);

        // Win pays `2 * (1 - edge)` of the stake. The coin stays a true 50/50;
        // the edge lives only in the payout multiplier.
        let payout_bps = FAIR_MULTIPLIER_BPS
            .checked_sub(2u64.checked_mul(house.edge_bps as u64).ok_or(SolflipError::MathOverflow)?)
            .ok_or(SolflipError::MathOverflow)?;
        let potential_payout = (amount as u128)
            .checked_mul(payout_bps as u128)
            .ok_or(SolflipError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(SolflipError::MathOverflow)?;
        let potential_payout =
            u64::try_from(potential_payout).map_err(|_| SolflipError::MathOverflow)?;

        // Escrow stake: leaves the player's liability, becomes at-risk.
        player.balance = player.balance.checked_sub(amount).ok_or(SolflipError::MathOverflow)?;
        house.total_liabilities = house
            .total_liabilities
            .checked_sub(amount)
            .ok_or(SolflipError::MathOverflow)?;
        // Lock the full potential payout so the house can always pay a winner.
        house.locked = house
            .locked
            .checked_add(potential_payout)
            .ok_or(SolflipError::MathOverflow)?;

        // Solvency: the vault must back all balances + all locked payouts.
        let vault_ai = ctx.accounts.vault.to_account_info();
        let rent_min = Rent::get()?.minimum_balance(vault_ai.data_len());
        let required = rent_min
            .checked_add(house.total_liabilities).ok_or(SolflipError::MathOverflow)?
            .checked_add(house.locked).ok_or(SolflipError::MathOverflow)?;
        require!(vault_ai.lamports() >= required, SolflipError::InsufficientHouseBankroll);

        // Record the bet.
        let bet = &mut ctx.accounts.bet;
        bet.player = ctx.accounts.player.key();
        bet.nonce = player.nonce;
        bet.amount = amount;
        bet.side = side;
        bet.force = force;
        bet.potential_payout = potential_payout;
        bet.status = BetStatus::Pending;
        bet.slot_placed = Clock::get()?.slot;

        // Stats.
        player.nonce = player.nonce.checked_add(1).ok_or(SolflipError::MathOverflow)?;
        player.total_bets = player.total_bets.checked_add(1).ok_or(SolflipError::MathOverflow)?;
        player.total_wagered =
            player.total_wagered.checked_add(amount).ok_or(SolflipError::MathOverflow)?;
        house.total_bets = house.total_bets.checked_add(1).ok_or(SolflipError::MathOverflow)?;
        house.total_wagered =
            house.total_wagered.checked_add(amount).ok_or(SolflipError::MathOverflow)?;

        // CPI: request randomness from ORAO VRF. `force` seeds the randomness PDA.
        let cpi_accounts = RequestV2 {
            payer: ctx.accounts.player.to_account_info(),
            network_state: ctx.accounts.config.to_account_info(),
            treasury: ctx.accounts.treasury.to_account_info(),
            request: ctx.accounts.random.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.vrf.to_account_info(), cpi_accounts);
        orao_solana_vrf::cpi::request_v2(cpi_ctx, force)?;

        emit!(BetPlaced {
            player: ctx.accounts.player.key(),
            nonce: bet.nonce,
            amount,
            side,
            potential_payout,
            force,
        });
        Ok(())
    }

    /// Settle a pending bet once ORAO has fulfilled its randomness. Reads the
    /// VRF output, maps it to heads/tails, applies the payout, and closes the
    /// bet account (rent returned to the player).
    pub fn settle_bet(ctx: Context<SettleBet>) -> Result<()> {
        let bet = &ctx.accounts.bet;
        require!(bet.status == BetStatus::Pending, SolflipError::BetAlreadySettled);

        // Read + verify the ORAO randomness account.
        let rand_ai = &ctx.accounts.random;
        require!(!rand_ai.data_is_empty(), SolflipError::RandomnessNotFulfilled);
        let rand_data = RandomnessAccountData::try_deserialize(&mut &rand_ai.data.borrow()[..])
            .map_err(|_| SolflipError::RandomnessNotFulfilled)?;
        let randomness = rand_data
            .fulfilled_randomness()
            .ok_or(SolflipError::RandomnessNotFulfilled)?;

        // First 8 bytes -> u64. Coin result = value % 2.
        let value = u64::from_le_bytes(randomness[0..8].try_into().unwrap());
        let result_side = (value % 2) as u8;
        let won = result_side == bet.side;

        let amount = bet.amount;
        let nonce = bet.nonce;
        let side = bet.side;
        let potential_payout = bet.potential_payout;

        let house = &mut ctx.accounts.house;
        let player = &mut ctx.accounts.player_account;

        // Release the locked payout.
        house.locked = house
            .locked
            .checked_sub(potential_payout)
            .ok_or(SolflipError::MathOverflow)?;

        if won {
            player.balance =
                player.balance.checked_add(potential_payout).ok_or(SolflipError::MathOverflow)?;
            house.total_liabilities = house
                .total_liabilities
                .checked_add(potential_payout)
                .ok_or(SolflipError::MathOverflow)?;
            house.total_paid_out = house
                .total_paid_out
                .checked_add(potential_payout)
                .ok_or(SolflipError::MathOverflow)?;
            player.wins = player.wins.checked_add(1).ok_or(SolflipError::MathOverflow)?;
        } else {
            // House keeps the stake (already sitting in the vault as equity).
            player.losses = player.losses.checked_add(1).ok_or(SolflipError::MathOverflow)?;
        }
        house.total_settled =
            house.total_settled.checked_add(1).ok_or(SolflipError::MathOverflow)?;

        // Mark for the emitted event (account is closed right after).
        let bet = &mut ctx.accounts.bet;
        bet.status = if won { BetStatus::Won } else { BetStatus::Lost };

        emit!(BetSettled {
            player: ctx.accounts.player.key(),
            nonce,
            amount,
            side,
            result_side,
            random_value: value,
            won,
            payout: if won { potential_payout } else { 0 },
        });
        Ok(())
    }
}

/// Solvency invariant: the vault must always be able to cover its rent-exempt
/// minimum, every player's balance, and every pending bet's locked payout.
fn assert_solvent(house: &House, vault_ai: &AccountInfo) -> Result<()> {
    let rent_min = Rent::get()?.minimum_balance(vault_ai.data_len());
    let required = rent_min
        .checked_add(house.total_liabilities)
        .ok_or(SolflipError::MathOverflow)?
        .checked_add(house.locked)
        .ok_or(SolflipError::MathOverflow)?;
    require!(vault_ai.lamports() >= required, SolflipError::VaultInsolvent);
    Ok(())
}

// ----------------------------------------------------------------------------
// Account contexts
// ----------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeHouse<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + House::INIT_SPACE,
        seeds = [HOUSE_SEED],
        bump
    )]
    pub house: Account<'info, House>,

    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED],
        bump
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetConfig<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [HOUSE_SEED],
        bump = house.bump,
        has_one = authority @ SolflipError::Unauthorized
    )]
    pub house: Account<'info, House>,
}

#[derive(Accounts)]
pub struct FundTreasury<'info> {
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = player,
        space = 8 + Player::INIT_SPACE,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump
    )]
    pub player_account: Account<'info, Player>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_account.bump,
        constraint = player_account.owner == player.key() @ SolflipError::Unauthorized
    )]
    pub player_account: Account<'info, Player>,
}

#[derive(Accounts)]
#[instruction(amount: u64, side: u8, force: [u8; 32])]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,

    #[account(mut, seeds = [VAULT_SEED], bump = vault.bump)]
    pub vault: Account<'info, Vault>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_account.bump,
        constraint = player_account.owner == player.key() @ SolflipError::Unauthorized
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        init,
        payer = player,
        space = 8 + Bet::INIT_SPACE,
        seeds = [BET_SEED, player.key().as_ref(), &force],
        bump
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: ORAO randomness account, validated by its PDA seeds + the ORAO program.
    #[account(
        mut,
        seeds = [RANDOMNESS_ACCOUNT_SEED, &force],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub random: AccountInfo<'info>,

    /// CHECK: ORAO treasury, taken from NetworkState.config.treasury (verified by the VRF program).
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [CONFIG_ACCOUNT_SEED],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub config: Account<'info, NetworkState>,

    pub vrf: Program<'info, OraoVrf>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleBet<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [HOUSE_SEED], bump = house.bump)]
    pub house: Account<'info, House>,

    #[account(
        mut,
        seeds = [PLAYER_SEED, player.key().as_ref()],
        bump = player_account.bump,
        constraint = player_account.owner == player.key() @ SolflipError::Unauthorized
    )]
    pub player_account: Account<'info, Player>,

    #[account(
        mut,
        seeds = [BET_SEED, player.key().as_ref(), &bet.force],
        bump,
        has_one = player @ SolflipError::Unauthorized,
        close = player
    )]
    pub bet: Account<'info, Bet>,

    /// CHECK: ORAO randomness account for this bet's force seed.
    #[account(
        seeds = [RANDOMNESS_ACCOUNT_SEED, &bet.force],
        bump,
        seeds::program = orao_solana_vrf::ID
    )]
    pub random: AccountInfo<'info>,
}

// ----------------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------------

#[event]
pub struct Deposited {
    pub player: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct Withdrawn {
    pub player: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct BetPlaced {
    pub player: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub side: u8,
    pub potential_payout: u64,
    pub force: [u8; 32],
}

#[event]
pub struct BetSettled {
    pub player: Pubkey,
    pub nonce: u64,
    pub amount: u64,
    pub side: u8,
    pub result_side: u8,
    pub random_value: u64,
    pub won: bool,
    pub payout: u64,
}
