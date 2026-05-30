"use client";

import { useState } from "react";
import { explorerAddr, explorerTx } from "@/lib/constants";
import { fmtSol, shorten, vrfValue, SIDE, type Side } from "@/lib/format";
import type { BetRecord } from "@/lib/useSolflip";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="label shrink-0 pt-0.5">{label}</span>
      <span className="text-right font-mono text-[0.78rem] text-bone">{children}</span>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-bone-dim hover:text-brass-bright">
      {children} ↗
    </a>
  );
}

function recompute(vrfHex: string, side: Side) {
  const bytes = Uint8Array.from(vrfHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const value = vrfValue(bytes);
  const resultSide = Number(value % 2n) as Side;
  return { value, resultSide, won: resultSide === side };
}

export function VerifyReceipt({
  bet,
  programId,
  onSettle,
  settling,
}: {
  bet: BetRecord;
  programId: string;
  onSettle: (bet: BetRecord) => void;
  settling: boolean;
}) {
  const [checked, setChecked] = useState<null | { resultSide: Side; won: boolean }>(null);

  const badge =
    bet.status === "won"
      ? { t: "WON", c: "var(--color-jade)" }
      : bet.status === "lost"
      ? { t: "LOST", c: "var(--color-ember)" }
      : { t: bet.status.toUpperCase(), c: "var(--color-brass-bright)" };

  const settled = bet.status === "won" || bet.status === "lost";

  return (
    <div className="panel overflow-hidden p-0">
      {/* perforated header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: "1px dashed var(--color-line)" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-[0.7rem] font-semibold tracking-wider"
            style={{ color: badge.c }}
          >
            ● {badge.t}
          </span>
          <span className="label">
            called {SIDE[bet.side]} · {fmtSol(bet.amount)} SOL
          </span>
        </div>
        <span className="font-mono text-[0.68rem] text-ash">
          {new Date(bet.ts).toLocaleTimeString()}
        </span>
      </div>

      <div className="px-5 py-3">
        {!settled ? (
          <div className="flex items-center justify-between gap-3 py-2">
            <p className="text-sm text-bone-dim">
              {bet.status === "placing"
                ? "Submitting place_bet…"
                : "Randomness requested. Waiting for the ORAO oracle to fulfill."}
            </p>
            {bet.status === "pending" && (
              <button
                disabled={settling}
                onClick={() => onSettle(bet)}
                className="btn-ghost shrink-0 px-3 py-2 text-xs"
              >
                {settling ? "Checking…" : "Check & settle"}
              </button>
            )}
          </div>
        ) : (
          <>
            <Row label="Program">
              <ExtLink href={explorerAddr(programId)}>{shorten(programId, 5)}</ExtLink>
            </Row>
            <Row label="place_bet">
              {bet.placeTx ? (
                <ExtLink href={explorerTx(bet.placeTx)}>{shorten(bet.placeTx, 6)}</ExtLink>
              ) : (
                "—"
              )}
            </Row>
            <Row label="settle_bet">
              {bet.settleTx ? (
                <ExtLink href={explorerTx(bet.settleTx)}>{shorten(bet.settleTx, 6)}</ExtLink>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Force seed">{shorten(bet.forceHex, 8)}</Row>
            <Row label="ORAO randomness">
              <ExtLink href={explorerAddr(bet.randomnessAccount)}>
                {shorten(bet.randomnessAccount, 5)}
              </ExtLink>
            </Row>
            <Row label="VRF output">{bet.vrfHex ? shorten(bet.vrfHex, 8) : "—"}</Row>

            {/* the mapping math */}
            <div
              className="mt-2 rounded-xl bg-black/30 p-3 font-mono text-[0.74rem] leading-relaxed text-bone-dim"
              style={{ border: "1px solid var(--color-line)" }}
            >
              <div>
                value = u64(VRF[0..8], LE) ={" "}
                <span className="text-bone">{bet.value}</span>
              </div>
              <div>
                value % 2 ={" "}
                <span className="text-bone">{bet.resultSide}</span> →{" "}
                <span style={{ color: badge.c }}>{SIDE[bet.resultSide as Side]}</span>
              </div>
              <div>
                you called {bet.side} ({SIDE[bet.side]}) ⇒{" "}
                <span style={{ color: badge.c }}>{bet.won ? "WIN" : "LOSS"}</span>
                {bet.won ? `, pays ${fmtSol(bet.potentialPayout)} SOL` : ""}
              </div>
            </div>

            {/* client-side recompute */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => bet.vrfHex && setChecked(recompute(bet.vrfHex, bet.side))}
                className="btn-ghost px-3 py-2 text-xs"
                disabled={!bet.vrfHex}
              >
                Recompute in my browser
              </button>
              {checked && (
                <span
                  className="font-mono text-[0.74rem]"
                  style={{
                    color:
                      checked.won === bet.won && checked.resultSide === bet.resultSide
                        ? "var(--color-jade)"
                        : "var(--color-ember)",
                  }}
                >
                  {checked.won === bet.won && checked.resultSide === bet.resultSide
                    ? "✓ matches the on-chain result"
                    : "✗ mismatch"}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
