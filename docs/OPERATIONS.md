# SolFlip — operations runbook

How the live deployment is wired and how to operate it. For the build-from-scratch
resume guide and the SBF dependency gotchas, see [`../PROGRESS.md`](../PROGRESS.md).

## Topology

```
browser ──HTTPS──▶ Cloudflare (casino.aiengineerhelper.com, proxied)
                      │
                      ▼  HTTPS to origin 31.220.78.216:443
                   Traefik  (container `traefik`, v3.3, network traefik-public)
                      │  file provider: /home/claude-developer/traefik/dynamic/casino.yml
                      │  router Host(`casino.aiengineerhelper.com`) → service casino
                      ▼  http://solflip-casino:3000  (Docker DNS, same network)
                   solflip-casino  (Next.js standalone, container, port 3000)
                      │  browser → public devnet RPC + ORAO VRF
                      ▼
                   Solana devnet program AfiEkweWBAgbfZe97PH8kdfZXbQFeaetV1CoC48nr3rB
```

- **TLS:** Traefik serves the wildcard Cloudflare origin cert (`/certs/cert.pem`) — same
  `tls: {}` pattern as the other dynamic configs. No per-deploy cert work.
- **DNS:** the `casino` record already exists in Cloudflare (proxied). No wildcard DNS, so any
  *new* subdomain would need a record added.
- **Repo copy** of the route: [`../deploy/traefik-casino.yml`](../deploy/traefik-casino.yml)
  (the live file is `/home/claude-developer/traefik/dynamic/casino.yml`; Traefik watches the dir
  and hot-reloads on change).

## Redeploy the frontend (after a code change)

```bash
cd /home/claude-developer/igaming-challendge-casino/app
docker build -t solflip-casino:latest .
docker rm -f solflip-casino
docker run -d --name solflip-casino \
  --network traefik-public --restart unless-stopped \
  solflip-casino:latest
```

The Traefik route is already in place and points at the container name, so no proxy change is
needed. Verify:

```bash
docker logs solflip-casino | tail            # expect "✓ Ready"
curl -s -o /dev/null -w "%{http_code}\n" https://casino.aiengineerhelper.com/   # expect 200
```

> Optional: pass a dedicated RPC at build time with
> `--build-arg`-style env by editing the Dockerfile, or bake `NEXT_PUBLIC_RPC_URL` into the build
> environment (it's read at build for the client bundle). Default is the public devnet RPC.

## Container lifecycle

```bash
docker ps --filter name=solflip-casino                 # status
docker logs -f solflip-casino                           # tail logs
docker restart solflip-casino                           # restart
docker rm -f solflip-casino                             # stop & remove
```

`--restart unless-stopped` means it survives host reboots. The image is local (not in a
registry); a `docker image prune -a` would remove it — rebuild with the command above.

## Program / on-chain

```bash
export PATH="$HOME/.avm/bin:$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
cd /home/claude-developer/igaming-challendge-casino

anchor build                                  # -> target/deploy/solflip.so + idl + types
anchor deploy --provider.cluster devnet       # redeploy (upgrade); ~2-3 SOL
node scripts/init.mjs                          # idempotent: ensure house + top up bankroll
FUND_SOL=0 node scripts/init.mjs               # init only, no extra bankroll
node scripts/smoke-bet.mjs                     # e2e: deposit + place + settle a real bet
```

If the frontend's program interface changes, refresh the bundled IDL/types:

```bash
cp target/idl/solflip.json app/src/idl/solflip.json
cp target/types/solflip.ts  app/src/idl/solflip.ts
```

Authority/house wallet `36i1HkahCQb7nFbuAGq6PZiEKWuuKzHkevqLqbwoEA8Q`
(`~/.config/solana/id.json`) is the upgrade authority and bankroll funder — keep it funded and
**do not delete** it or `target/deploy/solflip-keypair.json` (defines the program ID).

## Troubleshooting

| Symptom | Check |
|---|---|
| Site 502/503 | `docker ps`/`docker logs solflip-casino`; is it on `traefik-public`? `docker network inspect traefik-public \| grep solflip` |
| Site 404 from Traefik | route file present + valid YAML at `/home/claude-developer/traefik/dynamic/casino.yml`; `docker logs traefik \| tail` |
| TLS error | wildcard cert at `/home/claude-developer/traefik/certs/cert.pem`; Cloudflare SSL mode = Full |
| Flip stuck "pending" | ORAO devnet oracle latency — escrowed bet is safe; the receipt's "Check & settle" retries `settle_bet` |
| Balances not loading | public devnet RPC rate limit — set a dedicated `NEXT_PUBLIC_RPC_URL` and rebuild |
| Bet fails "InsufficientHouseBankroll" | vault bankroll too low for the locked payout — `node scripts/init.mjs` (FUND_SOL) to top up |
| SBF build error (edition2024 / rustc 1.85) | re-apply the dependency pins — see PROGRESS.md "SBF dependency pins" |

## Do-not-disturb

The host runs other containers on `traefik-public` (traefik, litellm, crossposter, syncthing,
3x-ui, monitoring). SolFlip only **adds** the `solflip-casino` container and the `casino.yml`
route — don't touch the others or the Traefik compose/cert setup.
