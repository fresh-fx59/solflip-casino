"use client";

import dynamic from "next/dynamic";
import { explorerAddr } from "@/lib/constants";
import { shorten } from "@/lib/format";

const WalletButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Header({ programId }: { programId: string }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="display-xl text-bone" style={{ fontSize: "2rem" }}>
            Sol<span style={{ color: "var(--color-brass-bright)" }}>Flip</span>
          </span>
        </div>
        <div className="hidden flex-col gap-1 border-l border-line pl-4 sm:flex">
          <span className="label">Provably fair · ORAO VRF</span>
          <a
            href={explorerAddr(programId)}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[0.72rem] text-bone-dim transition-colors hover:text-brass-bright"
            title="All funds move only through this on-chain program"
          >
            program {shorten(programId, 5)} ↗
          </a>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="chip" style={{ borderColor: "rgba(69,214,160,0.35)" }}>
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--color-jade)" }}
          />
          Solana devnet
        </span>
        <WalletButton />
      </div>
    </header>
  );
}
