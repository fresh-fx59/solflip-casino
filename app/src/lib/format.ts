import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export const lamportsToSol = (lamports: number | bigint): number =>
  Number(lamports) / LAMPORTS_PER_SOL;

export const solToLamports = (sol: number): number =>
  Math.round(sol * LAMPORTS_PER_SOL);

export function fmtSol(lamports: number | bigint, dp = 3): string {
  const v = lamportsToSol(lamports);
  return v.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export const shorten = (s: string, n = 4): string =>
  s.length <= n * 2 + 1 ? s : `${s.slice(0, n)}…${s.slice(-n)}`;

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** First 8 bytes of the VRF output, little-endian → bigint (matches the program). */
export const vrfValue = (randomness: Uint8Array): bigint => {
  let v = 0n;
  for (let i = 0; i < 8; i++) v |= BigInt(randomness[i]) << (8n * BigInt(i));
  return v;
};

export const SIDE = ["Heads", "Tails"] as const;
export type Side = 0 | 1;
