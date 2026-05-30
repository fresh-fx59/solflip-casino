# SolFlip frontend (`app/`)

The Next.js 16 + TypeScript frontend for SolFlip. See the [root README](../README.md) for the
full project (what it is, the provably-fair model, architecture) and
[`../docs/OPERATIONS.md`](../docs/OPERATIONS.md) for deploy/runbook.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

It talks to the already-deployed devnet program — just connect a wallet (Phantom, set to
**devnet**) with a little devnet SOL.

## Layout

```
src/lib/constants.ts    program ID, PDAs, ORAO ids, explorer helpers
src/lib/useSolflip.tsx  the Anchor + ORAO client hook: deposit/withdraw and the
                        place_bet → waitFulfilled → settle_bet state machine
src/lib/format.ts       lamports/SOL, hex, the VRF value % 2 mapping
src/components/         Providers (wallet, devnet) · Coin (3D framer-motion) ·
                        Header · FlipCard · Dashboard · VerifyReceipt · Landing
src/idl/                solflip.json + solflip.ts (copied from ../target; regenerate
                        after a program ABI change — see docs/OPERATIONS.md)
src/app/                layout (fonts) · page (orchestrator) · globals.css (theme)
Dockerfile              standalone production image (see docs/OPERATIONS.md)
```

## Build / production

```bash
npm run build && npm start          # local production server
# or build the container — see ../docs/OPERATIONS.md
```

`next.config.ts` sets `output: "standalone"` for a small Docker image. Fonts (Fraunces, IBM Plex
Mono, Hanken Grotesk) are fetched and self-hosted at build time via `next/font`.
