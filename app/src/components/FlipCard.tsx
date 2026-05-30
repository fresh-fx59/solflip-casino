"use client";

import { useState } from "react";
import { Coin } from "./Coin";
import { fmtSol, solToLamports, SIDE, type Side } from "@/lib/format";
import { WIN_MULTIPLIER } from "@/lib/constants";
import type { BetRecord, HouseState } from "@/lib/useSolflip";

type Phase = "idle" | "placing" | "pending" | "settling" | "won" | "lost";

const STATUS: Record<Phase, { text: string; tone: string }> = {
  idle: { text: "Pick a side, set your stake, and flip.", tone: "text-bone-dim" },
  placing: { text: "Escrowing your stake on-chain…", tone: "text-brass-bright" },
  pending: {
    text: "Requesting randomness from ORAO VRF — the coin is in the air.",
    tone: "text-brass-bright",
  },
  settling: { text: "Oracle fulfilled. Settling the bet on-chain…", tone: "text-brass-bright" },
  won: { text: "", tone: "text-jade" },
  lost: { text: "", tone: "text-ember" },
};

export function FlipCard({
  phase,
  busy,
  casinoBalance,
  house,
  latest,
  onFlip,
}: {
  phase: Phase;
  busy: boolean;
  casinoBalance: number;
  house: HouseState | null;
  latest: BetRecord | null;
  onFlip: (side: Side, lamports: number) => void;
}) {
  const [side, setSide] = useState<Side>(0);
  const minBet = house?.minBet ?? solToLamports(0.01);
  const maxBet = house?.maxBet ?? solToLamports(0.1);
  const [amount, setAmount] = useState("0.05");

  const lamports = solToLamports(parseFloat(amount) || 0);
  const cap = Math.min(maxBet, casinoBalance);
  const tooLow = lamports < minBet;
  const tooHigh = lamports > maxBet;
  const insufficient = lamports > casinoBalance;
  const invalid = tooLow || tooHigh || insufficient || lamports <= 0;
  const potential = Math.floor((lamports * (20000 - 2 * (house?.edgeBps ?? 200))) / 10000);

  const landedSide =
    (phase === "won" || phase === "lost") && latest?.resultSide != null
      ? (latest.resultSide as Side)
      : null;

  const resolved = phase === "won" || phase === "lost";
  const status = STATUS[phase];

  return (
    <div className="felt relative flex flex-col items-center gap-7 rounded-[26px] px-6 py-10 sm:px-10">
      {/* Coin */}
      <div className="flex h-[240px] items-center justify-center">
        <Coin phase={phase} chosenSide={side} landedSide={landedSide} />
      </div>

      {/* Status / result */}
      <div className="min-h-[54px] text-center">
        {resolved && latest ? (
          <div className="rise">
            <div
              className={`display-xl ${status.tone}`}
              style={{ fontSize: "1.7rem" }}
            >
              {SIDE[latest.resultSide as Side]} —{" "}
              {phase === "won"
                ? `you won ${fmtSol(latest.potentialPayout)} SOL`
                : "house wins"}
            </div>
            <p className="label mt-1">
              you called {SIDE[latest.side]} · verified below
            </p>
          </div>
        ) : (
          <p className={`max-w-sm text-sm ${status.tone} ${phase !== "idle" ? "breathe" : ""}`}>
            {status.text}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex w-full max-w-sm flex-col gap-4">
        {/* Side toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-black/30 p-1.5">
          {([0, 1] as Side[]).map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => setSide(s)}
              className="rounded-xl px-4 py-3 font-display text-lg transition-all"
              style={
                side === s
                  ? {
                      color: "#20180a",
                      background:
                        "linear-gradient(180deg,#f0cf67,#c9a227 60%,#8a6d16)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.5) inset",
                    }
                  : { color: "var(--color-bone-dim)" }
              }
            >
              {SIDE[s]}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            disabled={busy}
            onChange={(e) => setAmount(e.target.value)}
            className="field w-full px-3 py-3 text-base"
            aria-label="Stake in SOL"
          />
          <button
            disabled={busy || cap <= 0}
            onClick={() => setAmount((cap / 1e9).toString())}
            className="chip"
          >
            Max
          </button>
        </div>

        <button
          disabled={busy || invalid || !house}
          onClick={() => onFlip(side, lamports)}
          className="btn-brass px-6 py-4 text-lg"
        >
          {busy ? "Flipping…" : `Flip for ${fmtSol(lamports, 2)} SOL`}
        </button>

        <p className="text-center font-mono text-[0.72rem] text-ash">
          {insufficient
            ? "Not enough casino balance — deposit first."
            : tooLow
            ? `Minimum bet is ${fmtSol(minBet, 2)} SOL`
            : tooHigh
            ? `Maximum bet is ${fmtSol(maxBet, 2)} SOL`
            : `Win pays ${fmtSol(potential)} SOL (${WIN_MULTIPLIER}×) · coin is a true 50/50`}
        </p>
      </div>
    </div>
  );
}
