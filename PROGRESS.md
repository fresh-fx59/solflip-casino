# SolFlip — Build Progress & Resume Guide

> **Resume doc.** Safe to close the session; everything needed to continue is here and in git.
> Last updated: 2026-05-30. Challenge deadline: **2026-06-01 06:00 GMT+3**.

## TL;DR — where we are

A provably-fair coin-flip casino on **Solana devnet** (ORAO VRF). **Core is DONE and LIVE.**
Program built + deployed + house initialized + 1.5 SOL bankroll. Frontend built and **live at
https://casino.example.com** (Docker container `solflip-casino` on `traefik-public`,
routed by `/home/claude-developer/traefik/dynamic/casino.yml`). The **full bet lifecycle is
verified on-chain** (place_bet → ORAO fulfill → settle_bet → 1.96× payout; real txs in README).
README + scripts done. **Remaining: human deliverables** — record the 5-min Loom, assemble the
Notion page, send to Telegram <challenge-contact>. Authority wallet ~1.0 SOL left.

## ▶️ To resume: run these in order

```bash
# 0. Always set PATH first (avm + solana + cargo)
export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd /home/claude-developer/igaming-challendge-casino

# Program is already built + deployed + initialized. To rebuild from scratch:
#   anchor build                                   # -> target/deploy/solflip.so + idl + types
#   anchor deploy --provider.cluster devnet        # only if redeploying
#   node scripts/init.mjs                           # idempotent; tops up bankroll (FUND_SOL=0 to skip)
# NOTE: scripts/init.mjs needs the node_modules symlink: `ln -sfn app/node_modules node_modules`

# THE WORK NOW IS THE FRONTEND — see "Next steps". cd app && npm run dev
```

## ✅ Done

- **Research** (web + OSS), critically reviewed — see `docs/superpowers/specs/2026-05-30-solflip-casino-design.md`.
- **Toolchain installed**: Agave/Solana CLI 2.1.0, Anchor 0.31.1 (via avm), platform-tools v1.43, Node 20, Rust 1.94 (host).
- **GitHub repo** (public): https://github.com/fresh-fx59/solflip-casino
- **Design spec** committed.
- **Anchor program written** (`programs/solflip/src/`): `lib.rs`, `state.rs`, `errors.rs`, `constants.rs`.
  Instructions: `initialize_house`, `set_config`, `fund_treasury`, `deposit`, `withdraw`,
  `place_bet` (ORAO `request_v2` CPI), `settle_bet` (reads fulfilled randomness, closes bet).
- **SBF build FIXED & program builds** (`anchor build` → `target/deploy/solflip.so` + IDL + types).
  Root cause: the all-latest `Cargo.lock` pulled crates needing rust 1.85/edition2024, but
  platform-tools ships rustc 1.79. Fix = pin transitive offenders down + MSRV-aware resolver hint
  + enable `anchor-lang/init-if-needed` (needed by `Deposit.player_account`). See gotchas.
- **DEPLOYED to devnet** (tx `51Ng7b96…`, ~2.45 SOL). Program live at the Program ID below.
- **House initialized + bankroll funded** via `scripts/init.mjs`:
  `initialize_house(edge_bps=200, min=0.01, max=0.1 SOL)` (tx `3bAKwmBc…`) +
  `fund_treasury(1.5 SOL)` (tx `57Cu9YjH…`). Vault holds **1.5 SOL**.
- **Frontend scaffolded** in `app/` (Next.js 16 + TS + Tailwind v4, App Router, src dir) with deps
  installed: `@solana/web3.js@1`, `@coral-xyz/anchor@0.31.1`, `@solana/wallet-adapter-*`,
  `@orao-network/solana-vrf@0.8.0`, `framer-motion`, `react-hot-toast`. **No UI built yet.**
- **Deployer wallet**: was 5 devnet SOL; ~1.05 SOL left after deploy + init + bankroll.

## ⏭️ Next steps (in priority order)

1. ~~`anchor build`~~ ✅ · ~~Deploy~~ ✅ · ~~Init house + bankroll~~ ✅ · ~~Frontend~~ ✅ ·
   ~~Dockerize + Traefik route + live URL~~ ✅ · ~~e2e on-chain verify (smoke-bet.mjs)~~ ✅ · ~~README~~ ✅
2. **Loom (5 min):** open https://casino.example.com, connect Phantom (devnet, funded),
   deposit → flip → show the Verify panel recompute → explorer links. Narrate the fairness model.
3. **Notion page:** repo link, live URL, README contents, Loom embed. Send via Telegram <challenge-contact>.
4. **Redeploy frontend after code changes:** `cd app && docker build -t solflip-casino:latest . &&
   docker rm -f solflip-casino && docker run -d --name solflip-casino --network traefik-public
   --restart unless-stopped solflip-casino:latest` (Traefik route already in place).

> All built: WalletProvider (devnet), `useSolflip` hook (Anchor + ORAO client, deposit/withdraw,
> place→waitFulfilled→settle), framer-motion Coin, Dashboard, FlipCard, VerifyReceipt (in-browser
> recompute). Frontend Dockerized (`app/Dockerfile`, standalone) and routed via Traefik file
> provider (`deploy/traefik-casino.yml` mirrors the live `/home/claude-developer/traefik/dynamic/casino.yml`).
> **Not done:** an automated Anchor test suite (`tests/solflip.ts`) — verified instead via
> `scripts/smoke-bet.mjs` against the live devnet oracle.

## 🔑 Key facts / addresses / paths

| Thing | Value |
|---|---|
| Repo (public) | https://github.com/fresh-fx59/solflip-casino |
| Local path | `/home/claude-developer/igaming-challendge-casino` (branch `main`) |
| **Live URL** | https://casino.example.com (HTTP 200 verified through Cloudflare) |
| Frontend container | `solflip-casino` (image `solflip-casino:latest`), net `traefik-public`, port 3000, `--restart unless-stopped` |
| Traefik route | `/home/claude-developer/traefik/dynamic/casino.yml` (file provider, wildcard origin cert) |
| e2e bet (verified) | place `JLKLb1rQ…i4aAwB` · settle `54iJYVpk…dY4HPb` (won, 1.96×) |
| **Program ID** | `AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB` |
| **House PDA** | `4AnGd2FJJ1augZkgDrvBtTBUU7UjYLMqdMG6Ertvfczi` (seeds `[b"house"]`) |
| **Vault PDA** | `GHUN1SSjz4huMno91KtmVrr27xXX7WNBeHtMagguDZiS` (seeds `[b"vault"]`, holds bankroll) |
| Player PDA | `[b"player", wallet]` · Bet PDA `[b"bet", wallet, force]` |
| Deploy tx | `51Ng7b9635Pg3UsSi2H4gqtvDvZY4h8f357F2oR9kyJQiNhEfwjS3kWrQ28JzAzzMhXHfUZiwiT7TzbC9n9Vq9LM` |
| init_house tx | `3bAKwmBc9o5vUzz4m3dJxj6CqrFi8QrnX9rAQs2nBDgtuuS6cNjbix5s7CxVCsYXVyG2ujKH19GphdWbPcjqty1w` |
| fund_treasury tx | `57Cu9YjHn6niddpHAiBe6XWkRvGHbYuAwrASAPspbJwnZSDMcaJVdiWskXyp1bDV6f6i19nR12eB98vdmZFdv1HS` |
| Program keypair | `target/deploy/solflip-keypair.json` — **DO NOT DELETE** (defines program ID; gitignored) |
| Deployer/house wallet | `36i1HkahCQb7nFbuAGq6PZiEKWuuKzHkevqLqbwoEA8Q` |
| Deployer keypair | `~/.config/solana/id.json` — **~1.05 SOL left, do not delete** |
| ORAO VRF (devnet) | `VRFzZoJdhFWL8rkvu87LpKM3RbcVezpMEc6X5GVDr7y` |
| ORAO crate / npm | `orao-solana-vrf = 0.6.1` (features `cpi`) / `@orao-network/solana-vrf@0.8.0` |
| House edge / limits | 200 bps (2%); min 0.01 SOL, max 0.1 SOL; win pays 1.96× |

## ⚙️ Environment & gotchas

- **PATH** (needed every shell):
  `export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"`
- **Solana cluster** is set to devnet (`solana config get` to confirm).
- **ORAO VRF is devnet/mainnet only** — must deploy to **devnet**, not testnet.
- **`place_bet` and `settle_bet` are two transactions** — randomness can't be requested and
  consumed in the same tx. Frontend: place → `waitFulfilled(force)` → settle.
- **SBF dependency pins** (CRITICAL — if `Cargo.lock` is regenerated/deleted, re-apply or the
  build fails with `edition2024 required` / `requires rustc 1.85`). platform-tools ships rustc
  1.79; modern crates want 1.85. `programs/solflip/Cargo.toml` sets `rust-version = "1.79.0"` and
  `.cargo/config.toml` sets `resolver.incompatible-rust-versions = "fallback"` (only honored by
  host cargo ≥1.84; the SBF cargo just warns "unused config key" — harmless). The resolver only
  avoids crates that declare a high MSRV *themselves*, so also pin the transitive offenders:
  ```bash
  cargo update -p blake3 --precise 1.5.5            # drops cpufeatures 0.3 / digest 0.11 cluster
  cargo update -p indexmap --precise 2.7.1          # drops hashbrown 0.16/0.17
  cargo update -p proc-macro-crate@<ver> --precise 3.3.0
  ```
  Also `anchor-lang` MUST have `features = ["init-if-needed"]` (Deposit.player_account uses it).
- **node_modules symlink**: repo-root `node_modules -> app/node_modules` (gitignored) lets
  `scripts/*.mjs` resolve `@coral-xyz/anchor` etc. Recreate with `ln -sfn app/node_modules node_modules`.
- **Hosting**: Traefik (Docker, network `traefik-public`) is the reverse proxy on :443 with
  Cloudflare DNS-challenge TLS. Dynamic config dir: `/home/claude-developer/traefik/dynamic/`.
  Do **not** disturb existing containers (traefik, litellm, syncthing, etc.) — none were started
  by this build; the casino frontend will be a *new* container added to `traefik-public`.

## Toolchain versions (pinned)

Anchor 0.31.1 · Agave/Solana 2.1.0 · platform-tools 1.43 · `orao-solana-vrf` 0.6.1 ·
web3.js v1 + `@coral-xyz/anchor` 0.31.1 frontend stack · Node 20.
