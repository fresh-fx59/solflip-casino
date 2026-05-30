# SolFlip — Build Progress & Resume Guide

> **Resume doc.** Safe to close the session; everything needed to continue is here and in git.
> Last updated: 2026-05-30. Challenge deadline: **2026-06-01 06:00 GMT+3**.

## TL;DR — where we are

A provably-fair coin-flip casino on **Solana devnet** (ORAO VRF). The Anchor program is
**written and compiles**; a dependency pin was just applied to fix the SBF build. Frontend
is scaffolded with deps installed but **not yet built**. Program is **not yet deployed**.
Deployer wallet is **funded with 5 devnet SOL**.

## ▶️ To resume: run these in order

```bash
# 0. Always set PATH first (avm + solana + cargo)
export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd /home/claude-developer/igaming-challendge-casino

# 1. Build the program (the proc-macro-crate pin in Cargo.lock fixes the edition2024 error).
#    Expect target/deploy/solflip.so + target/idl/solflip.json afterwards.
anchor build

# 2. Confirm wallet + cluster
solana config get                 # URL must be devnet
solana balance                    # ~5 SOL (deployer/house: 36i1HkahCQb7nFbuAGq6PZiEKWuuKzHkevqLqbwoEA8Q)

# 3. Deploy to devnet (~2-3 SOL)
anchor deploy --provider.cluster devnet

# 4. (next) init house + fund bankroll, build frontend, deploy frontend (see "Next steps")
```

## ✅ Done

- **Research** (web + OSS), critically reviewed — see `docs/superpowers/specs/2026-05-30-solflip-casino-design.md`.
- **Toolchain installed**: Agave/Solana CLI 2.1.0, Anchor 0.31.1 (via avm), platform-tools v1.43, Node 20, Rust 1.94 (host).
- **GitHub repo** (public): https://github.com/fresh-fx59/solflip-casino
- **Design spec** committed.
- **Anchor program written** (`programs/solflip/src/`): `lib.rs`, `state.rs`, `errors.rs`, `constants.rs`.
  Instructions: `initialize_house`, `set_config`, `fund_treasury`, `deposit`, `withdraw`,
  `place_bet` (ORAO `request_v2` CPI), `settle_bet` (reads fulfilled randomness, closes bet).
- **SBF build fix applied**: pinned `proc-macro-crate` → `3.3.0` in `Cargo.lock` (avoids
  `toml_parser 1.x` which needs `edition2024`, unsupported by platform-tools' Cargo 1.79).
  Earlier `anchor build` failed on this; the pin removes it. **Needs one rebuild to confirm `.so`.**
- **Frontend scaffolded** in `app/` (Next.js + TS + Tailwind, App Router, src dir) with deps
  installed: `@solana/web3.js@1`, `@coral-xyz/anchor@0.31.1`, `@solana/wallet-adapter-*`,
  `@orao-network/solana-vrf@0.8.0`, `framer-motion`, `react-hot-toast`.
- **Deployer wallet funded**: 5 devnet SOL (user funded via faucet).

## ⏭️ Next steps (in priority order)

1. **`anchor build`** → verify `target/deploy/solflip.so` and `target/idl/solflip.json` exist.
2. **Deploy** to devnet: `anchor deploy --provider.cluster devnet`. Verify on Explorer:
   `https://explorer.solana.com/address/AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB?cluster=devnet`.
3. **Initialize** house + bankroll: write `scripts/init.ts` (Anchor TS) calling
   `initialize_house(edge_bps=200, min_bet=0.01 SOL, max_bet=0.5 SOL)` then `fund_treasury(~2 SOL)`.
   (Bankroll must cover potential winnings — solvency is enforced on-chain in `place_bet`.)
4. **Frontend build**: copy `target/idl/solflip.json` + `target/types/solflip.ts` into `app/src/`.
   Pages/components: WalletProvider (devnet, empty `wallets={[]}`), Dashboard (wallet + casino
   balance, deposit/withdraw), Flip game (pick side + amount → `place_bet` → `vrf.waitFulfilled(force)`
   → `settle_bet`, Framer Motion coin), **Verify panel** (program ID, tx sigs, ORAO randomness
   account, force seed, VRF value, payout math, Explorer `?cluster=devnet` deep links).
5. **Tests**: `tests/solflip.ts`. Note ORAO VRF lives on devnet/mainnet only — either test against
   devnet, or emulate the oracle locally with ORAO's `InitBuilder`/`FulfillBuilder`.
6. **Deploy frontend** at `casino.aiengineerhelper.com`:
   - `next build` (consider `output: 'standalone'`), Dockerfile, run container on the
     **`traefik-public`** Docker network.
   - Add `/home/claude-developer/traefik/dynamic/casino.yml` with a router
     `Host(\`casino.aiengineerhelper.com\`)` → the container's service (Traefik does Cloudflare
     DNS-challenge TLS automatically; domain is Cloudflare-proxied to this server's Traefik).
7. **Deliverables**: finalize `README.md` (what works/doesn't, why Solana, hardest unknown,
   what's next), record 5-min Loom, assemble Notion page, send via Telegram @ryazhenkacustomers.

## 🔑 Key facts / addresses / paths

| Thing | Value |
|---|---|
| Repo (public) | https://github.com/fresh-fx59/solflip-casino |
| Local path | `/home/claude-developer/igaming-challendge-casino` (branch `main`) |
| Live URL (target) | https://casino.aiengineerhelper.com |
| **Program ID** | `AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB` |
| Program keypair | `target/deploy/solflip-keypair.json` — **DO NOT DELETE** (defines program ID; gitignored) |
| Deployer/house wallet | `36i1HkahCQb7nFbuAGq6PZiEKWuuKzHkevqLqbwoEA8Q` |
| Deployer keypair | `~/.config/solana/id.json` — **holds the 5 SOL, do not delete** |
| ORAO VRF (devnet) | `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y` |
| ORAO crate / npm | `orao-solana-vrf = 0.6.1` (features `cpi`) / `@orao-network/solana-vrf@0.8.0` |
| House edge | 200 bps (2%) — coin is true 50/50; win pays 1.96× |

## ⚙️ Environment & gotchas

- **PATH** (needed every shell):
  `export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"`
- **Solana cluster** is set to devnet (`solana config get` to confirm).
- **ORAO VRF is devnet/mainnet only** — must deploy to **devnet**, not testnet.
- **`place_bet` and `settle_bet` are two transactions** — randomness can't be requested and
  consumed in the same tx. Frontend: place → `waitFulfilled(force)` → settle.
- **Cargo.lock pin**: if `Cargo.lock` is ever regenerated/deleted, re-apply:
  `cargo update -p proc-macro-crate@3.5.0 --precise 3.3.0` (else SBF build fails on edition2024).
- **Hosting**: Traefik (Docker, network `traefik-public`) is the reverse proxy on :443 with
  Cloudflare DNS-challenge TLS. Dynamic config dir: `/home/claude-developer/traefik/dynamic/`.
  Do **not** disturb existing containers (traefik, litellm, syncthing, etc.) — none were started
  by this build; the casino frontend will be a *new* container added to `traefik-public`.

## Toolchain versions (pinned)

Anchor 0.31.1 · Agave/Solana 2.1.0 · platform-tools 1.43 · `orao-solana-vrf` 0.6.1 ·
web3.js v1 + `@coral-xyz/anchor` 0.31.1 frontend stack · Node 20.
