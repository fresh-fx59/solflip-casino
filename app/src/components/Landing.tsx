"use client";

import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Coin } from "./Coin";
import { WIN_MULTIPLIER } from "@/lib/constants";

const PILLARS = [
  {
    k: "01",
    t: "Oracle randomness",
    d: "Each flip's result comes from ORAO VRF — an Ed25519 verifiable random function run by an oracle we don't control. Not blockhash, not our server.",
  },
  {
    k: "02",
    t: "Two honest transactions",
    d: "place_bet requests randomness; settle_bet consumes it once fulfilled. The coin can't be known when you bet — the suspense is real, not staged.",
  },
  {
    k: "03",
    t: "Verify every byte",
    d: "Force seed, randomness account, VRF output and the value % 2 mapping are all on-chain. Recompute any result in your own browser.",
  },
];

export function Landing() {
  const { setVisible } = useWalletModal();

  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
      <section className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rise">
          <span className="label">Solana devnet · provably fair</span>
          <h1
            className="display-xl mt-4 text-bone"
            style={{ fontSize: "clamp(2.6rem, 6vw, 4.6rem)" }}
          >
            Flip a coin you
            <br />
            can actually{" "}
            <span style={{ color: "var(--color-brass-bright)" }}>trust</span>.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-bone-dim">
            A coin-flip casino where the randomness comes from an on-chain VRF
            oracle, the math is public, and every outcome is verifiable. The
            coin is a true 50/50 — a win pays {WIN_MULTIPLIER}× (2% house edge,
            and nothing hidden).
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setVisible(true)}
              className="btn-brass px-7 py-4 text-lg"
            >
              Connect wallet to play
            </button>
            <span className="font-mono text-xs text-ash">
              Need devnet SOL? Use a faucet, then deposit.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="felt flex h-[360px] w-full max-w-sm items-center justify-center rounded-[28px]">
            <Coin phase="idle" chosenSide={0} landedSide={null} size={240} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <div key={p.k} className="panel p-6">
            <span className="font-mono text-sm text-brass">{p.k}</span>
            <h3 className="font-display mt-2 text-xl text-bone">{p.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-bone-dim">{p.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
