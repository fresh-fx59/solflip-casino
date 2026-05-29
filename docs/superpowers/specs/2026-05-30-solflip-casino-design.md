# SolFlip — Provably-Fair Coin-Flip Casino on Solana Devnet

**Design doc** · 2026-05-30 · 48h vibe-code challenge

## 1. Goal & success criteria

Build a polished, on-chain-verifiable casino on **Solana devnet** where a user can:

1. Connect a wallet (Phantom, via Wallet Standard auto-discovery).
2. Deposit test SOL into the casino.
3. Play a coin-flip game and win or lose.
4. Withdraw their balance back to their wallet.

The casino logic must be **verifiable on a block explorer** — a paranoid player should
be able to confirm it is not a scam. The house must have a mathematical edge.

**Definition of done:** deployed Anchor program on devnet + live frontend at
`https://casino.aiengineerhelper.com`, full deposit→play→withdraw loop working, every
action linkable on Solana Explorer (`?cluster=devnet`), README + Loom.

## 2. Why Solana (over Ethereum)

- Cheap, fast transactions → a coin-flip casino needs many small txs; sub-cent fees and
  ~400ms confirmation make the UX feel like a real product, not a testnet toy.
- **ORAO VRF** gives genuinely external, cryptographically verifiable randomness with the
  same program ID on devnet and mainnet — the strongest "not a scam" story for the budget.
- Anchor + PDAs give a clean, auditable program model where the program is the *only* code
  that can move funds.

## 3. Randomness — the core trust decision

On-chain pseudo-randomness on Solana (recent blockhash / slot hashes / clock) is
**exploitable**: it is public before submission (a player can pre-compute and only submit
winning bets) and leader-manipulable. Fatal for "prove it's not a scam."

**Decision: ORAO VRF** (`orao-solana-vrf`, Apache-2.0 / SDK ISC). Ed25519 VRF with a
Byzantine quorum and on-chain proof. The randomness comes from an oracle program we do
**not** control (`VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`), so neither the house nor
the player can bias an outcome.

**Async pattern (cannot request & consume randomness in one tx):**

- `place_bet(amount, side, force)` — escrows the stake from the player's on-chain balance,
  records the bet, and CPIs into ORAO `request_v2` to create a randomness PDA seeded by
  `force` (a per-bet 32-byte seed). Outcome is **not** known yet.
- `settle_bet` — once the oracle fulfils the randomness PDA, reads the VRF output, maps it
  to heads/tails, applies the payout (with house edge) to the player's balance, and emits
  an event. Re-derivable and verifiable by anyone from the `force` seed.

This split is mirrored 1:1 from ORAO's `russian-roulette` example (Apache-2.0).

## 4. On-chain architecture (Anchor program `solflip`)

Currency = **native devnet SOL** (free, universally understood, maximally verifiable).

### Accounts (PDAs)

| PDA | Seeds | Holds | Purpose |
|-----|-------|-------|---------|
| `House` | `[b"house"]` | config + stats | authority, min/max bet, house-edge bps, vault bump, totals |
| `Vault` | `[b"vault"]` | pooled lamports | single pool backing all player balances + house bankroll |
| `Player` | `[b"player", user]` | balance, nonce, stats | per-user ledger: deposited balance, bet counter |
| `Bet` | `[b"bet", user, nonce]` | stake, side, force, state | one bet; `Pending` until settled, then `Won`/`Lost` |

### Instructions

- `initialize_house(min_bet, max_bet, edge_bps)` — one-time; sets config, creates vault.
- `deposit(amount)` — System CPI transfer user→vault; credit `Player.balance`.
- `withdraw(amount)` — debit `Player.balance`; direct-lamport transfer vault→user.
- `place_bet(amount, side, force)` — `amount<=balance`, within min/max, `amount*2 <=`
  vault-backable; debit balance; create `Bet{Pending}`; CPI `request_v2(force)`.
- `settle_bet` — require randomness PDA fulfilled; compute `win = (vrf % 10000) < win_threshold`;
  on win credit `amount + amount*(10000-edge_bps)/10000` (net), else stake stays in vault
  (house keeps it). Mark `Bet` resolved; update stats; emit `BetSettled` event.

### House edge (transparent)

Fair coin-flip pays 2×. We pay **1.96×** on a win (`edge_bps = 200` → 2.00% edge). The win
threshold stays 50/50 on the coin; the edge is purely in the payout multiplier, shown in
the UI as "Coin is fair (50/50). Win pays 1.96× — 2% house edge." Checked math everywhere
(`checked_mul`/`checked_add`/`checked_sub`); asserts vault solvency before every payout.

### Fund-safety patterns (Solana Foundation guide)

- Deposit (user → program-owned vault): **System Program CPI** (renders as a real transfer).
- Payout (program-owned vault → user): **direct lamport manipulation**
  (`try_borrow_mut_lamports`), since a program-owned PDA can't be a System CPI source.
- Vault keeps rent-exempt minimum; `withdraw`/payout assert `vault.lamports() - rent >= amount`.

## 5. Frontend (Next.js, web3.js v1 stack)

Chosen to match ORAO's `@coral-xyz/anchor` + legacy `@solana/web3.js` SDK (kit interop is a
trap for 48h).

- **Stack:** Next.js (App Router) + TypeScript + Tailwind + Framer Motion (coin animation).
- **Wallet:** `@solana/wallet-adapter-react` + `-react-ui` + `-wallets`; Phantom auto-discovers
  via Wallet Standard (empty `wallets={[]}`). Devnet cluster.
- **Program client:** `@coral-xyz/anchor` with the generated IDL; `@orao-network/solana-vrf`
  for `randomnessAccountAddress` / `waitFulfilled`.
- **Screens:** Connect → Dashboard (wallet balance, casino balance, deposit/withdraw) →
  Flip (pick side + amount, animated flip, pending→resolved) → **Verify panel** per bet.

### Verify panel (the trust UX)

For each bet, surface and deep-link (Explorer `?cluster=devnet`):
program ID · `place_bet` tx · ORAO randomness account · `force` seed · VRF output ·
the win/lose mapping math · `settle_bet` tx · payout. A "Verify" recompute happens
client-side so the user trusts math, not our server. Header always shows the program ID
+ "All funds move only through this program."

## 6. State machine (UX ↔ chain)

`idle → (deposit) → ready → (place_bet) → pending-randomness (spinning) →
(oracle fulfils) → settling → resolved (won/lost) → ready`. The "spinning" state maps
exactly to the on-chain window between request and fulfilment — honest, not fake suspense.

## 7. Deployment

- **Program:** `anchor deploy` to devnet from the funded deployer keypair
  (`36i1HkahCQb7nFbuAGq6PZiEKWuuKzHkevqLqbwoEA8Q`).
- **Frontend:** static/Next.js build in a Docker container on the existing `traefik-public`
  network; a Traefik dynamic config file routes `Host(casino.aiengineerhelper.com)` to it.
  Traefik already does Cloudflare DNS-challenge TLS; the domain is Cloudflare-proxied to it.

## 8. Scope / YAGNI

**In:** one coin-flip game, deposit/withdraw, ORAO VRF, verify panel, polished UI, README,
Loom. **Out (stated as "what's next"):** SPL chip token, multiple games, liquidity pools,
jackpots, leaderboard persistence, mainnet. A second game (dice/limbo) is a stretch goal
only if the core loop is solid with time to spare.

## 9. Key risks & mitigations

- **ORAO devnet oracle liveness** → UI handles long pending gracefully; `settle_bet` is
  retry-safe and idempotent; bet funds are escrowed, never lost, can always settle later.
- **Devnet airdrop rate limits** → patient retry loop; multiple faucets for deploy funding.
- **Anchor/Solana version drift** → pinned Anchor 0.31.1 + Agave 2.1.0 + platform-tools 1.43.
