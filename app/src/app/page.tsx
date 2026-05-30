"use client";

import { Header } from "@/components/Header";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";
import { FlipCard } from "@/components/FlipCard";
import { VerifyReceipt } from "@/components/VerifyReceipt";
import { useSolflip } from "@/lib/useSolflip";
import { explorerAddr, ORAO_VRF, WIN_MULTIPLIER } from "@/lib/constants";

export default function Home() {
  const s = useSolflip();
  const flipPhase = s.phase === "error" ? "idle" : s.phase;
  const settling = s.phase === "pending" || s.phase === "settling";

  return (
    <div className="flex min-h-full flex-col">
      <Header programId={s.programId} />

      {!s.connected ? (
        <main className="flex-1">
          <Landing />
        </main>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 pb-20">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <FlipCard
              phase={flipPhase}
              busy={s.busy}
              casinoBalance={s.player?.balance ?? 0}
              house={s.house}
              latest={s.bets[0] ?? null}
              onFlip={s.flip}
            />
            <Dashboard
              house={s.house}
              player={s.player}
              walletBalance={s.walletBalance}
              vaultBalance={s.vaultBalance}
              busy={s.busy}
              onDeposit={s.deposit}
              onWithdraw={s.withdraw}
            />
          </div>

          {/* Verify / history */}
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="font-display text-2xl text-bone">Proof of fairness</h2>
              <span className="label">every bet, fully on-chain</span>
            </div>
            {s.bets.length === 0 ? (
              <div className="panel p-8 text-center text-sm text-bone-dim">
                Your bets will appear here as verifiable receipts — force seed,
                ORAO randomness account, VRF output and the recompute.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {s.bets.map((b) => (
                  <VerifyReceipt
                    key={b.id}
                    bet={b}
                    programId={s.programId}
                    onSettle={s.settle}
                    settling={settling}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 py-8">
        <div className="flex flex-col gap-3 border-t border-line pt-6 text-xs text-ash sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono">
            Coin is a true 50/50 · win pays {WIN_MULTIPLIER}× · 2% house edge ·
            devnet only
          </span>
          <div className="flex items-center gap-4 font-mono">
            <a
              href={explorerAddr(s.programId)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brass-bright"
            >
              Program ↗
            </a>
            <a
              href={explorerAddr(ORAO_VRF.toBase58())}
              target="_blank"
              rel="noreferrer"
              className="hover:text-brass-bright"
            >
              ORAO VRF ↗
            </a>
            <a
              href="https://github.com/fresh-fx59/solflip-casino"
              target="_blank"
              rel="noreferrer"
              className="hover:text-brass-bright"
            >
              Source ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
