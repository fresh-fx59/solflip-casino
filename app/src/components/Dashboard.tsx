"use client";

import { useState } from "react";
import { fmtSol, solToLamports } from "@/lib/format";
import { WIN_MULTIPLIER } from "@/lib/constants";
import type { HouseState, PlayerState } from "@/lib/useSolflip";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="label">{label}</span>
      <span
        className={`font-mono tnum text-sm ${accent ? "text-brass-bright" : "text-bone"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function Dashboard({
  house,
  player,
  walletBalance,
  vaultBalance,
  busy,
  onDeposit,
  onWithdraw,
}: {
  house: HouseState | null;
  player: PlayerState | null;
  walletBalance: number;
  vaultBalance: number;
  busy: boolean;
  onDeposit: (lamports: number) => void;
  onWithdraw: (lamports: number) => void;
}) {
  const [amount, setAmount] = useState("0.05");
  const lamports = solToLamports(parseFloat(amount) || 0);
  const casino = player?.balance ?? 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Balances */}
      <div className="panel p-5">
        <div className="flex items-end justify-between">
          <div>
            <span className="label">Casino balance</span>
            <div className="display-xl mt-1 text-bone" style={{ fontSize: "2.4rem" }}>
              {fmtSol(casino)}
              <span className="ml-1 font-mono text-sm text-ash">SOL</span>
            </div>
          </div>
          <div className="text-right">
            <span className="label">In wallet</span>
            <div className="font-mono tnum mt-1 text-bone-dim">
              {fmtSol(walletBalance)} <span className="text-ash">SOL</span>
            </div>
          </div>
        </div>

        {/* Deposit / withdraw */}
        <div className="mt-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field w-full px-3 py-2.5 text-sm"
              aria-label="Amount in SOL"
            />
            <span className="font-mono text-xs text-ash">SOL</span>
          </div>
          <div className="flex gap-2">
            {["0.05", "0.1", "0.25"].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className="chip flex-1 justify-center"
              >
                {v}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={busy || lamports <= 0}
              onClick={() => onDeposit(lamports)}
              className="btn-brass px-4 py-2.5 text-sm"
            >
              Deposit
            </button>
            <button
              disabled={busy || lamports <= 0 || lamports > casino}
              onClick={() => onWithdraw(lamports)}
              className="btn-ghost px-4 py-2.5 text-sm"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* House terms */}
      <div className="panel p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="label">The house</span>
          <span className="font-mono text-[0.7rem] text-jade">
            fair coin · {WIN_MULTIPLIER}× on win
          </span>
        </div>
        <div className="divide-y divide-[var(--color-line)]">
          <Stat
            label="House edge"
            value={house ? `${(house.edgeBps / 100).toFixed(2)}%` : "—"}
          />
          <Stat
            label="Bet limits"
            value={
              house ? `${fmtSol(house.minBet, 2)} – ${fmtSol(house.maxBet, 2)}` : "—"
            }
          />
          <Stat label="Bankroll (vault)" value={`${fmtSol(vaultBalance)} SOL`} accent />
          <Stat
            label="Locked in bets"
            value={house ? `${fmtSol(house.locked)} SOL` : "—"}
          />
          <Stat label="Total bets" value={house ? `${house.totalBets}` : "—"} />
          <Stat
            label="Settled"
            value={house ? `${house.totalSettled}` : "—"}
          />
        </div>
      </div>

      {/* Player record */}
      {player && player.totalBets > 0 && (
        <div className="panel p-5">
          <span className="label">Your record</span>
          <div className="mt-2 flex items-center justify-between font-mono text-sm">
            <span className="text-jade">{player.wins} won</span>
            <span className="text-ash">·</span>
            <span className="text-ember">{player.losses} lost</span>
            <span className="text-ash">·</span>
            <span className="text-bone-dim">{fmtSol(player.totalWagered)} wagered</span>
          </div>
        </div>
      )}
    </div>
  );
}
