import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID as ORAO_PROGRAM_ID } from "@orao-network/solana-vrf";
import idl from "@/idl/solflip.json";

export const CLUSTER = "devnet" as const;
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";

export const PROGRAM_ID = new PublicKey(idl.address);
export const ORAO_VRF = ORAO_PROGRAM_ID;

// PDA seeds — must match programs/solflip/src/constants.rs
export const HOUSE_SEED = Buffer.from("house");
export const VAULT_SEED = Buffer.from("vault");
export const PLAYER_SEED = Buffer.from("player");
export const BET_SEED = Buffer.from("bet");

export const [HOUSE_PDA] = PublicKey.findProgramAddressSync(
  [HOUSE_SEED],
  PROGRAM_ID
);
export const [VAULT_PDA] = PublicKey.findProgramAddressSync(
  [VAULT_SEED],
  PROGRAM_ID
);

export function playerPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [PLAYER_SEED, owner.toBuffer()],
    PROGRAM_ID
  )[0];
}

export function betPda(owner: PublicKey, force: Uint8Array): PublicKey {
  return PublicKey.findProgramAddressSync(
    [BET_SEED, owner.toBuffer(), Buffer.from(force)],
    PROGRAM_ID
  )[0];
}

// House-edge model (mirrors the on-chain math, for the transparent UI copy)
export const EDGE_BPS = 200; // 2%
export const WIN_MULTIPLIER = (20000 - 2 * EDGE_BPS) / 10000; // 1.96×

// Explorer deep links (always devnet)
const EXPLORER = "https://explorer.solana.com";
export const explorerTx = (sig: string) =>
  `${EXPLORER}/tx/${sig}?cluster=${CLUSTER}`;
export const explorerAddr = (addr: string) =>
  `${EXPLORER}/address/${addr}?cluster=${CLUSTER}`;
