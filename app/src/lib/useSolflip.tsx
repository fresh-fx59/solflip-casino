"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  Orao,
  randomnessAccountAddress,
  networkStateAccountAddress,
} from "@orao-network/solana-vrf";
import toast from "react-hot-toast";

import idl from "@/idl/solflip.json";
import type { Solflip } from "@/idl/solflip";
import {
  HOUSE_PDA,
  VAULT_PDA,
  ORAO_VRF,
  PROGRAM_ID,
  playerPda,
  betPda,
  EDGE_BPS,
  explorerTx,
} from "@/lib/constants";
import { toHex, vrfValue, type Side } from "@/lib/format";

type Bnish = { toString(): string };
interface RawHouse {
  edgeBps: number;
  minBet: Bnish;
  maxBet: Bnish;
  totalLiabilities: Bnish;
  locked: Bnish;
  totalBets: Bnish;
  totalSettled: Bnish;
  totalWagered: Bnish;
  totalPaidOut: Bnish;
}
interface RawPlayer {
  balance: Bnish;
  nonce: Bnish;
  totalBets: Bnish;
  wins: Bnish;
  losses: Bnish;
  totalWagered: Bnish;
}

export interface HouseState {
  edgeBps: number;
  minBet: number;
  maxBet: number;
  totalLiabilities: number;
  locked: number;
  totalBets: number;
  totalSettled: number;
  totalWagered: number;
  totalPaidOut: number;
}

export interface PlayerState {
  balance: number;
  nonce: number;
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
}

export type BetStatus =
  | "placing"
  | "pending"
  | "settling"
  | "won"
  | "lost"
  | "error";

export interface BetRecord {
  id: string; // = forceHex (unique per bet)
  forceHex: string;
  side: Side;
  amount: number; // lamports
  potentialPayout: number; // lamports
  randomnessAccount: string;
  placeTx?: string;
  settleTx?: string;
  vrfHex?: string;
  value?: string; // bigint as string
  resultSide?: Side;
  won?: boolean;
  status: BetStatus;
  ts: number;
}

const bn = (x: { toString(): string }) => Number(x.toString());

function payoutFor(amount: number, edgeBps: number): number {
  const payoutBps = 20000 - 2 * edgeBps;
  return Math.floor((amount * payoutBps) / 10000);
}

export function useSolflip() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program<Solflip>(idl as unknown as Solflip, provider);
  }, [connection, wallet]);

  const orao = useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Orao(provider as never);
  }, [connection, wallet]);

  const [house, setHouse] = useState<HouseState | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<BetStatus | "idle">("idle");

  const owner = wallet?.publicKey ?? null;
  const storageKey = owner ? `solflip:bets:${owner.toBase58()}` : null;

  // Load persisted bet history for this wallet.
  useEffect(() => {
    if (!storageKey) {
      setBets([]);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setBets(raw ? (JSON.parse(raw) as BetRecord[]) : []);
    } catch {
      setBets([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: BetRecord[]) => {
      setBets(next);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  const upsertBet = useCallback(
    (rec: BetRecord) => {
      setBets((prev) => {
        const idx = prev.findIndex((b) => b.id === rec.id);
        const next =
          idx === -1
            ? [rec, ...prev]
            : prev.map((b) => (b.id === rec.id ? rec : b));
        if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
        return next;
      });
    },
    [storageKey]
  );

  // ── Reads ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!program) return;
    // Anchor types account keys by their PascalCase IDL name; the runtime keys
    // are camelCase. Bridge that with a narrow typed view of the namespace.
    const acc = program.account as unknown as {
      house: { fetchNullable(pk: PublicKey): Promise<RawHouse | null> };
      player: { fetchNullable(pk: PublicKey): Promise<RawPlayer | null> };
    };
    try {
      const h = await acc.house.fetchNullable(HOUSE_PDA);
      if (h)
        setHouse({
          edgeBps: h.edgeBps,
          minBet: bn(h.minBet),
          maxBet: bn(h.maxBet),
          totalLiabilities: bn(h.totalLiabilities),
          locked: bn(h.locked),
          totalBets: bn(h.totalBets),
          totalSettled: bn(h.totalSettled),
          totalWagered: bn(h.totalWagered),
          totalPaidOut: bn(h.totalPaidOut),
        });

      if (owner) {
        const p = await acc.player.fetchNullable(playerPda(owner));
        setPlayer(
          p
            ? {
                balance: bn(p.balance),
                nonce: bn(p.nonce),
                totalBets: bn(p.totalBets),
                wins: bn(p.wins),
                losses: bn(p.losses),
                totalWagered: bn(p.totalWagered),
              }
            : { balance: 0, nonce: 0, totalBets: 0, wins: 0, losses: 0, totalWagered: 0 }
        );
        setWalletBalance(await connection.getBalance(owner));
      }
      setVaultBalance(await connection.getBalance(VAULT_PDA));
    } catch (e) {
      console.error("refresh failed", e);
    }
  }, [program, owner, connection]);

  useEffect(() => {
    if (program) refresh();
  }, [program, refresh]);

  // ── Writes ─────────────────────────────────────────────────────────────
  const deposit = useCallback(
    async (lamports: number) => {
      if (!program || !owner) return;
      setBusy(true);
      try {
        const sig = await program.methods
          .deposit(new BN(lamports))
          .accountsPartial({
            player: owner,
            house: HOUSE_PDA,
            vault: VAULT_PDA,
            playerAccount: playerPda(owner),
            systemProgram: SystemProgram.programId,
          })
          .rpc();
        toast.success(
          <a href={explorerTx(sig)} target="_blank" rel="noreferrer">
            Deposited — view tx ↗
          </a>
        );
        await refresh();
      } catch (e) {
        toast.error(`Deposit failed: ${errMsg(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [program, owner, refresh]
  );

  const withdraw = useCallback(
    async (lamports: number) => {
      if (!program || !owner) return;
      setBusy(true);
      try {
        const sig = await program.methods
          .withdraw(new BN(lamports))
          .accountsPartial({
            player: owner,
            house: HOUSE_PDA,
            vault: VAULT_PDA,
            playerAccount: playerPda(owner),
          })
          .rpc();
        toast.success(
          <a href={explorerTx(sig)} target="_blank" rel="noreferrer">
            Withdrew — view tx ↗
          </a>
        );
        await refresh();
      } catch (e) {
        toast.error(`Withdraw failed: ${errMsg(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [program, owner, refresh]
  );

  // Settle a pending bet: wait for the oracle, consume randomness, recompute.
  const settle = useCallback(
    async (rec: BetRecord) => {
      if (!program || !orao || !owner) return;
      const force = Uint8Array.from(
        rec.forceHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
      );
      try {
        setPhase("pending");
        upsertBet({ ...rec, status: "pending" });
        const fulfilled = await orao.waitFulfilled(force);
        const randomness = fulfilled.randomness;

        setPhase("settling");
        upsertBet({ ...rec, status: "settling" });
        const settleTx = await program.methods
          .settleBet()
          .accountsPartial({
            player: owner,
            house: HOUSE_PDA,
            playerAccount: playerPda(owner),
            bet: betPda(owner, force),
            random: randomnessAccountAddress(force),
          })
          .rpc();

        const value = vrfValue(randomness);
        const resultSide = Number(value % 2n) as Side;
        const won = resultSide === rec.side;
        const settled: BetRecord = {
          ...rec,
          settleTx,
          vrfHex: toHex(randomness),
          value: value.toString(),
          resultSide,
          won,
          status: won ? "won" : "lost",
        };
        upsertBet(settled);
        setPhase(won ? "won" : "lost");
        await refresh();
        return settled;
      } catch (e) {
        upsertBet({ ...rec, status: "pending" });
        setPhase("idle");
        toast.error(`Settle failed: ${errMsg(e)}`);
      }
    },
    [program, orao, owner, refresh, upsertBet]
  );

  // Full flip: place_bet (CPI → ORAO request) then settle once fulfilled.
  const flip = useCallback(
    async (side: Side, lamports: number) => {
      if (!program || !orao || !owner || busy) return;
      setBusy(true);
      try {
        const force = new Uint8Array(32);
        crypto.getRandomValues(force);
        if (force.every((b) => b === 0)) force[0] = 1; // program rejects all-zero

        const forceHex = toHex(force);
        const random = randomnessAccountAddress(force);
        const networkState = networkStateAccountAddress();
        const ns = await orao.getNetworkState();
        const treasury = ns.config.treasury;
        const edgeBps = house?.edgeBps ?? EDGE_BPS;

        const rec: BetRecord = {
          id: forceHex,
          forceHex,
          side,
          amount: lamports,
          potentialPayout: payoutFor(lamports, edgeBps),
          randomnessAccount: random.toBase58(),
          status: "placing",
          ts: Date.now(),
        };
        setPhase("placing");
        upsertBet(rec);

        const placeTx = await program.methods
          .placeBet(new BN(lamports), side, Array.from(force))
          .accountsPartial({
            player: owner,
            house: HOUSE_PDA,
            vault: VAULT_PDA,
            playerAccount: playerPda(owner),
            bet: betPda(owner, force),
            random,
            treasury,
            config: networkState,
            vrf: ORAO_VRF,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        const placed = { ...rec, placeTx, status: "pending" as BetStatus };
        upsertBet(placed);
        await refresh();
        await settle(placed);
      } catch (e) {
        setPhase("idle");
        toast.error(`Bet failed: ${errMsg(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [program, orao, owner, busy, house, refresh, settle, upsertBet]
  );

  const clearPhase = useCallback(() => setPhase("idle"), []);

  return {
    connected: !!wallet,
    owner: owner?.toBase58() ?? null,
    programId: PROGRAM_ID.toBase58(),
    house,
    player,
    walletBalance,
    vaultBalance,
    bets,
    busy,
    phase,
    refresh,
    deposit,
    withdraw,
    flip,
    settle,
    clearPhase,
    persist,
  };
}

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e)
    return String((e as { message: unknown }).message).slice(0, 140);
  return String(e).slice(0, 140);
}
