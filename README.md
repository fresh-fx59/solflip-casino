# SolFlip — a provably-fair coin-flip casino on Solana

**Live:** https://casino.aiengineerhelper.com · **Network:** Solana **devnet**
**Program:** [`AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB`](https://explorer.solana.com/address/AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB?cluster=devnet)

Flip a coin where the randomness comes from an **on-chain VRF oracle you can verify**,
the payout math is public, and every bet — seed, randomness, and outcome — is reproducible
by anyone. The coin is a true 50/50; a win pays **1.96×** (a transparent 2% house edge).

Built in ~2 days for an iGaming vibe-code challenge. Stack: **Anchor 0.31** (Rust) +
**ORAO VRF** on-chain · **Next.js 16 + TypeScript** frontend · Dockerized behind Traefik.

---

## Why this is actually fair (the whole point)

A casino is only trustworthy if you don't have to trust it. On-chain pseudo-randomness
(blockhash, slot hashes, clock) is **exploitable** — it's public before you submit and
leader-manipulable, so a player could pre-compute and only submit winning bets. That's fatal.

SolFlip uses **[ORAO VRF](https://orao.network/)** (`VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y`),
an Ed25519 verifiable random function produced by an oracle program **we do not control**.
The flow is split across two transactions, because randomness can't be requested and consumed atomically:

1. **`place_bet(amount, side, force)`** — escrows your stake, records the bet, and CPIs into
   ORAO's `request_v2` to create a randomness account seeded by a per-bet 32-byte `force`.
   *The outcome does not exist yet.*
2. **`settle_bet`** — once the oracle fulfills the randomness, the program reads the VRF output,
   maps it to a side (`u64(VRF[0..8], little-endian) % 2`), applies the payout, and emits an event.

Because the mapping is deterministic and the inputs are all on-chain, **anyone can recompute any
result**. The site's *Proof of fairness* panel does exactly this in your browser and links every
artifact to the explorer: `place_bet` tx, ORAO randomness account, `force` seed, raw VRF bytes,
the `value % 2` math, and the `settle_bet` tx.

### Verified end-to-end on devnet

A scripted real bet (`scripts/smoke-bet.mjs`) exercising the full loop:

| step | signature |
|---|---|
| place_bet (ORAO CPI) | [`JLKLb1rQ…i4aAwB`](https://explorer.solana.com/tx/JLKLb1rQRqgFeCco26pPePuLT2z5oasW8GQ9LDvVSobxoESwLp2pHGwF8w19b4LXz65KzfYC36DnF11Qui4aAwB?cluster=devnet) |
| settle_bet | [`54iJYVpk…dY4HPb`](https://explorer.solana.com/tx/54iJYVpkg6KqVKLKqtUTkLcxHnnWd4Cr3Jk8u6W9nQWdQQouGFP8om8zxFSdAvzjGqhYJVBcbTG9vVA1oLdY4HPb?cluster=devnet) |

`value = 6786477176902090264 → % 2 = 0 (Heads)` → called Heads → **won**, paid 1.96×.

---

## How the money works (fund safety)

All lamports live in a single program-owned **`Vault`** PDA. Each player has an internal
**`balance`** (a withdrawable claim on the vault); bets only move that internal ledger. Real
lamports move only on `deposit`/`withdraw`.

- **Deposit** (user → vault): a System Program CPI transfer.
- **Payout / withdraw** (vault → user): direct lamport manipulation (a program-owned PDA can't
  be a System-CPI source).
- **Solvency invariant**, asserted on every state change and before every payout:
  `vault.lamports ≥ rent_exempt_minimum + Σ player balances + Σ locked bet payouts`.
  When a bet is placed, the *full* potential payout is locked, so the house can always pay a winner.
- All arithmetic uses `checked_*`; the configurable edge is capped (`MAX_EDGE_BPS = 1000`) so the
  house can never be configured into a "win pays 0" rug.

The coin stays a true 50/50 — the edge lives **only** in the payout multiplier
(`payout = stake · (2 − 2·edge)`), shown plainly in the UI.

---

## Architecture

```
programs/solflip/         Anchor program (Rust)
  src/lib.rs              instructions: initialize_house, set_config, fund_treasury,
                          deposit, withdraw, place_bet (ORAO CPI), settle_bet
  src/state.rs            House, Vault, Player, Bet accounts (PDAs)
  src/{constants,errors}.rs
app/                       Next.js 16 frontend (App Router, TS, Tailwind v4)
  src/lib/useSolflip.tsx  Anchor + ORAO client hook (the whole bet state machine)
  src/components/         Coin (framer-motion), FlipCard, Dashboard, VerifyReceipt, …
  Dockerfile             standalone production image
scripts/                   init.mjs (house + bankroll), smoke-bet.mjs (e2e test)
deploy/traefik-casino.yml  reverse-proxy route for the live URL
```

**PDAs:** `House [b"house"]` · `Vault [b"vault"]` · `Player [b"player", wallet]` ·
`Bet [b"bet", wallet, force]`.

---

## Run it locally

**Frontend** (talks to the already-deployed devnet program — just connect a wallet with devnet SOL):

```bash
cd app
npm install
npm run dev            # http://localhost:3000
```

**Program** (rebuild / redeploy — needs Anchor 0.31.1, Agave 2.1, platform-tools 1.43):

```bash
export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
anchor build
anchor deploy --provider.cluster devnet
node scripts/init.mjs              # initialize house + seed bankroll (idempotent)
node scripts/smoke-bet.mjs         # place + settle a real bet end-to-end
```

> **SBF build note:** platform-tools ships rustc 1.79, but the latest crate ecosystem wants
> rust 1.85 / edition2024. The build is kept green by an MSRV pin (`rust-version = "1.79.0"`,
> `.cargo/config.toml`) plus pinned transitive deps (blake3 1.5.5, indexmap 2.7.1,
> proc-macro-crate 3.3.0). See `PROGRESS.md` if `Cargo.lock` ever needs regenerating.

---

## What works · what doesn't

**Works:** deposit / withdraw · place + settle a bet against the live ORAO devnet oracle ·
the full provably-fair verify panel with in-browser recompute · solvency-checked payouts ·
deployed program + initialized house + funded bankroll + live, TLS-terminated frontend.

**Limitations / known rough edges:**
- **One game** (coin flip), **devnet only**, native SOL only — by design for the timebox.
- **Bet history is per-browser** (localStorage). The on-chain `Bet` account is closed on settle
  to reclaim rent, so the canonical record is the `place_bet`/`settle_bet` txs + the (permanent)
  ORAO randomness account, not a queryable list.
- **Oracle latency is real**: `settle_bet` waits on the ORAO devnet oracle. The UI handles a long
  pending state honestly; if a tab closes mid-flight, the escrowed bet is safe and re-settleable.
- Uses the **public devnet RPC** — fine for a demo, rate-limited under load.
- No automated Anchor test suite yet (ORAO lives only on devnet/mainnet; tests would need the
  devnet oracle or a local `InitBuilder`/`FulfillBuilder` mock). Verification is via `smoke-bet.mjs`.

---

## Why Solana (over an EVM chain)

- **Cost & speed:** sub-cent fees and ~400 ms confirmations make a deposit→flip→settle loop feel
  like a product, not a testnet toy. A two-tx VRF flow on most EVM testnets would feel sluggish.
- **A clean, auditable VRF primitive:** ORAO's request/fulfill model maps naturally to Anchor CPIs
  and the "request now, consume later" honesty the game needs.
- **PDAs** give a tidy money model: one program-owned vault + per-player ledger PDAs, with the
  program as the only thing that can move funds — easy to point at and say "verify this."

## Hardest unknown

Getting the **ORAO VRF CPI** right end-to-end: the exact account set for `request_v2`
(network state, treasury-from-config, the force-seeded randomness PDA), the two-transaction
choreography, and the off-chain `waitFulfilled` → `settle_bet` handoff — then proving it actually
fulfills on the devnet oracle. (A close second: keeping the old SBF toolchain building against a
crate ecosystem that has moved to edition2024.) Both are now solved and verified on-chain.

## What's next

SPL "chip" token · more games (dice/limbo) · a bankroll/liquidity pool · jackpots ·
indexer-backed global history + leaderboard · mainnet hardening + audit.

---

## Scope & disclaimer

Devnet demo for a coding challenge — **not** real-money gambling, not audited, not for production.
SOL here is free devnet SOL with no value.
