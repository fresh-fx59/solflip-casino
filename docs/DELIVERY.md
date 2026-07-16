# SolFlip — submission package

Everything you need to assemble the Notion page and record the Loom. The first
section is copy-paste-ready Notion content; the second is a scene-by-scene Loom
script timed to ~5 minutes.

---

## PART 1 — Notion page (copy-paste)

> Paste this into a new Notion page. Replace `‹LOOM_URL›` after recording, and
> drop in `docs/assets/solflip-home.png` as the cover/first image.

---

### SolFlip — a provably-fair coin-flip casino on Solana

A coin-flip casino where you don't have to trust the house: randomness comes from an
on-chain VRF oracle, the payout math is public, and **every bet is reproducible by anyone**.

**Links**
- 🎰 **Live demo:** https://casino.example.com  *(Solana devnet — connect Phantom with devnet SOL)*
- 💻 **Repo:** https://github.com/fresh-fx59/solflip-casino
- 🎬 **Walkthrough (5 min):** ‹LOOM_URL›
- 🔗 **Program (Explorer):** [`AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB`](https://explorer.solana.com/address/AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB?cluster=devnet)

**Stack:** Anchor 0.31 (Rust) + ORAO VRF on-chain · Next.js 16 + TypeScript + Tailwind frontend · Dockerized behind Traefik (Cloudflare TLS). Built in ~2 days.

**Why it's actually fair.** On-chain pseudo-randomness (blockhash/slot) is exploitable — public before submission and leader-manipulable. SolFlip uses **ORAO VRF**, an Ed25519 verifiable random function from an oracle the house doesn't control. Each bet is two transactions, because randomness can't be requested and consumed atomically:
1. `place_bet(amount, side, force)` escrows the stake and CPIs into ORAO `request_v2` (randomness account seeded by a per-bet 32-byte `force`). *Outcome doesn't exist yet.*
2. `settle_bet` reads the fulfilled VRF output and maps it: `u64(VRF[0..8], LE) % 2`. Deterministic → **anyone can recompute any result.** The site's *Proof of fairness* panel does this in your browser with explorer deep-links for every artifact.

**Verified end-to-end on devnet** (real txs):
- place_bet (ORAO CPI): [`JLKLb1rQ…i4aAwB`](https://explorer.solana.com/tx/JLKLb1rQRqgFeCco26pPePuLT2z5oasW8GQ9LDvVSobxoESwLp2pHGwF8w19b4LXz65KzfYC36DnF11Qui4aAwB?cluster=devnet)
- settle_bet: [`54iJYVpk…dY4HPb`](https://explorer.solana.com/tx/54iJYVpkg6KqVKLKqtUTkLcxHnnWd4Cr3Jk8u6W9nQWdQQouGFP8om8zxFSdAvzjGqhYJVBcbTG9vVA1oLdY4HPb?cluster=devnet) → `value % 2 = Heads`, called Heads → won, paid 1.96×.

**Money model.** All lamports live in one program-owned `Vault` PDA; each player has an internal withdrawable `balance`. A solvency invariant (`vault ≥ rent + Σ balances + Σ locked payouts`) is asserted on every state change, and the full potential payout is locked at bet time so the house can always pay a winner. Coin is a true 50/50; the 2% edge lives only in the 1.96× multiplier.

**What works:** deposit/withdraw · live ORAO-backed flips · provably-fair verify panel with in-browser recompute · solvency-checked payouts · deployed program + funded house + live TLS frontend.

**Limitations (by design / timebox):** one game, devnet only, native SOL; bet history is per-browser (the canonical record is the on-chain txs + permanent ORAO randomness account, since the `Bet` account is closed on settle to reclaim rent); settlement waits on the ORAO devnet oracle; public devnet RPC; no automated Anchor test suite yet (verified via `scripts/smoke-bet.mjs`).

**Why Solana:** sub-cent fees + ~400 ms confirmations make deposit→flip→settle feel like a product; ORAO's request/fulfill VRF maps cleanly to Anchor CPIs; PDAs give a tidy "the program is the only thing that can move funds" money model.

**Hardest unknown:** getting the ORAO VRF CPI right end-to-end (exact account set, the two-tx choreography, `waitFulfilled` → `settle_bet`) and proving it fulfills on the devnet oracle — plus keeping the old SBF toolchain (rustc 1.79) building against an edition2024 ecosystem. Both solved and verified.

**What's next:** SPL chip token · more games (dice/limbo) · liquidity pool · jackpots · indexer-backed global history + leaderboard · mainnet hardening + audit.

*Devnet demo for a coding challenge — not real-money gambling, not audited. SOL here is free devnet SOL.*

---

## PART 2 — Loom script (~5 min)

**Before recording:** Phantom set to **Devnet**, wallet funded with a little devnet SOL
(faucet: faucet.solana.com). Have two tabs ready: the live site and Solana Explorer
(devnet). Keep the README open for the addresses.

**[0:00–0:30] Hook + what it is**
> "This is SolFlip — a coin-flip casino on Solana devnet. The interesting part isn't the
> game, it's that you never have to trust me. The randomness comes from an on-chain VRF
> oracle I don't control, and every single bet can be re-verified by anyone. Let me show you."

Show the landing page. Point at the header chip — *"All funds move only through this program"* — and click the program ID to open it on Explorer (it's an executable program).

**[0:30–1:15] The fairness model (the pitch)**
> "Naive on-chain randomness — blockhash, slot — is exploitable: it's public before you
> submit, so you could only submit winning bets. So I use ORAO VRF, a verifiable random
> function from an oracle program. A bet is two transactions: place_bet escrows my stake and
> *requests* randomness; the outcome literally doesn't exist yet. Then settle_bet consumes the
> fulfilled randomness and maps it to heads or tails. Because the mapping is deterministic and
> all the inputs are on-chain, anyone can recompute the result."

**[1:15–1:45] Connect + deposit**
Connect Phantom (show the devnet badge). Deposit ~0.05 SOL.
> "I deposit into a program-owned vault. My balance is an internal ledger entry — a
> withdrawable claim. Real SOL only moves on deposit and withdraw; bets just move the ledger."

**[1:45–3:00] Place a flip — the honest suspense**
Pick a side, set the stake, hit Flip.
> "Watch the coin — it's spinning *because* it's actually in the air on-chain. That spin is the
> real window between requesting randomness and the oracle fulfilling it. This isn't fake
> suspense; if the oracle takes a few seconds, the coin keeps spinning."
Let it resolve. Call out the result and the payout (1.96× on a win).

**[3:00–4:15] Proof of fairness (the money shot)**
Scroll to the receipt for that bet.
> "Here's the whole proof. The force seed, the ORAO randomness account, the raw VRF output, and
> the math: take the first 8 bytes of the VRF as a little-endian number, mod 2 — that's the
> side. I called X, it landed Y."
Click **Recompute in my browser** → show the ✓ matches. Click the `place_bet` and `settle_bet`
explorer links.
> "This recompute runs in *my* browser, not the server. And these are the actual transactions on
> Explorer — the randomness account is permanent, so this bet stays verifiable forever."

**[4:15–4:45] Withdraw + the house**
Withdraw a bit. Point at the house panel (edge, limits, bankroll).
> "Withdraw moves real SOL back out. The house edge is 2%, shown plainly — the coin stays a true
> 50/50, the edge is only in the 1.96× payout. And there's an on-chain solvency check so the
> house can always cover every pending win."

**[4:45–5:00] Close**
> "So: a real on-chain casino loop — deposit, flip, settle, withdraw — where fairness is
> something you verify, not something you take my word for. Code's on GitHub, it's live on
> devnet. Thanks!"

**Tips:** rehearse one flip first (oracle latency varies); if a flip is slow on camera, talk
through the receipt of a previous bet while it settles. Keep Explorer links clickable on screen.
