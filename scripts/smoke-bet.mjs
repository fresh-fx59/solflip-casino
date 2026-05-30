// End-to-end smoke test of the full bet lifecycle on devnet, using the deployer
// wallet: deposit (if needed) → place_bet (ORAO request_v2 CPI) → waitFulfilled
// → settle_bet → recompute value % 2 and report win/loss + tx signatures.
//
//   node scripts/smoke-bet.mjs            # bets 0.02 SOL on Heads
import anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  Orao,
  randomnessAccountAddress,
  networkStateAccountAddress,
  PROGRAM_ID as ORAO_VRF,
} from "@orao-network/solana-vrf";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RPC = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const BET = Math.round(Number(process.env.BET_SOL ?? "0.02") * LAMPORTS_PER_SOL);
const SIDE = Number(process.env.SIDE ?? "0"); // 0=Heads 1=Tails

const idl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/solflip.json"), "utf8")
);
const programId = new PublicKey(idl.address);
const kpPath =
  process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config/solana/id.json");
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(kpPath, "utf8")))
);

const connection = new Connection(RPC, "confirmed");
const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
  commitment: "confirmed",
});
const program = new anchor.Program(idl, provider);
const orao = new Orao(provider);

const pda = (seeds) => PublicKey.findProgramAddressSync(seeds, programId)[0];
const house = pda([Buffer.from("house")]);
const vault = pda([Buffer.from("vault")]);
const playerAccount = pda([Buffer.from("player"), payer.publicKey.toBuffer()]);
const sol = (l) => (Number(l) / LAMPORTS_PER_SOL).toFixed(4);

console.log(`Player: ${payer.publicKey.toBase58()}`);

// 1. ensure casino balance covers the bet
let p = await program.account.player.fetchNullable(playerAccount);
const bal = p ? Number(p.balance.toString()) : 0;
console.log(`Casino balance: ${sol(bal)} SOL`);
if (bal < BET) {
  const dep = BET * 2;
  console.log(`Depositing ${sol(dep)} SOL…`);
  const sig = await program.methods
    .deposit(new anchor.BN(dep))
    .accountsPartial({
      player: payer.publicKey,
      house,
      vault,
      playerAccount,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`  deposit tx: ${sig}`);
}

// 2. place_bet (requests ORAO randomness via CPI)
const force = Uint8Array.from(crypto.randomBytes(32));
const random = randomnessAccountAddress(force);
const networkState = networkStateAccountAddress();
const treasury = (await orao.getNetworkState()).config.treasury;
const bet = pda([Buffer.from("bet"), payer.publicKey.toBuffer(), Buffer.from(force)]);

console.log(`\nForce seed:   ${Buffer.from(force).toString("hex")}`);
console.log(`Randomness:   ${random.toBase58()}`);
console.log(`Side:         ${SIDE === 0 ? "Heads" : "Tails"} · stake ${sol(BET)} SOL`);

const placeTx = await program.methods
  .placeBet(new anchor.BN(BET), SIDE, Array.from(force))
  .accountsPartial({
    player: payer.publicKey,
    house,
    vault,
    playerAccount,
    bet,
    random,
    treasury,
    config: networkState,
    vrf: ORAO_VRF,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
console.log(`place_bet tx: ${placeTx}`);

// 3. wait for the oracle to fulfill, then settle
console.log("Waiting for ORAO to fulfill randomness…");
const fulfilled = await orao.waitFulfilled(force);
const randomness = fulfilled.randomness;
console.log(`VRF output:   ${Buffer.from(randomness).toString("hex").slice(0, 32)}…`);

const settleTx = await program.methods
  .settleBet()
  .accountsPartial({
    player: payer.publicKey,
    house,
    playerAccount,
    bet,
    random,
  })
  .rpc();
console.log(`settle_bet tx: ${settleTx}`);

// 4. recompute (matches the program: first 8 bytes LE % 2)
let value = 0n;
for (let i = 0; i < 8; i++) value |= BigInt(randomness[i]) << (8n * BigInt(i));
const resultSide = Number(value % 2n);
const won = resultSide === SIDE;

p = await program.account.player.fetchNullable(playerAccount);
console.log(`\nvalue = ${value}  →  value % 2 = ${resultSide} (${resultSide === 0 ? "Heads" : "Tails"})`);
console.log(`RESULT: ${won ? "WON 🎉" : "lost"}`);
console.log(`Casino balance now: ${sol(Number(p.balance.toString()))} SOL`);
console.log(`Record: ${p.wins} W / ${p.losses} L`);
