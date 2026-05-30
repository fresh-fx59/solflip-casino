// Initialize the SolFlip house + seed the bankroll on devnet.
//
//   node scripts/init.mjs            # uses ~/.config/solana/id.json on devnet
//
// Idempotent: if the house already exists it skips initialize_house and only
// tops up the treasury. Game params below are tuned for a small devnet bankroll.
import anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- config -----------------------------------------------------------------
const RPC = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
const EDGE_BPS = 200; // 2% house edge -> win pays 1.96x
const MIN_BET = 0.01 * LAMPORTS_PER_SOL;
const MAX_BET = 0.1 * LAMPORTS_PER_SOL;
const FUND_SOL = Number(process.env.FUND_SOL ?? "1.5"); // bankroll to add
// -----------------------------------------------------------------------------

const idl = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../target/idl/solflip.json"), "utf8")
);
const programId = new PublicKey(idl.address);

const kpPath =
  process.env.ANCHOR_WALLET || path.join(os.homedir(), ".config/solana/id.json");
const secret = JSON.parse(fs.readFileSync(kpPath, "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secret));

const connection = new Connection(RPC, "confirmed");
const wallet = new anchor.Wallet(payer);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const program = new anchor.Program(idl, provider);

const [house] = PublicKey.findProgramAddressSync(
  [Buffer.from("house")],
  programId
);
const [vault] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault")],
  programId
);

const sol = (lamports) => (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);

console.log("Program:    ", programId.toBase58());
console.log("Authority:  ", payer.publicKey.toBase58());
console.log("House PDA:  ", house.toBase58());
console.log("Vault PDA:  ", vault.toBase58());
console.log("Balance:    ", sol(await connection.getBalance(payer.publicKey)), "SOL");
console.log("");

// 1. initialize_house (skip if already created)
const existing = await program.account.house.fetchNullable(house);
if (existing) {
  console.log("House already initialized — skipping initialize_house.");
  console.log("  edge_bps =", existing.edgeBps, "| min =", sol(existing.minBet), "| max =", sol(existing.maxBet));
} else {
  const sig = await program.methods
    .initializeHouse(EDGE_BPS, new anchor.BN(MIN_BET), new anchor.BN(MAX_BET))
    .accounts({
      authority: payer.publicKey,
      house,
      vault,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log("initialize_house tx:", sig);
  console.log(`  edge_bps=${EDGE_BPS} min=${sol(MIN_BET)} max=${sol(MAX_BET)} SOL`);
}

// 2. fund_treasury (seed bankroll)
if (FUND_SOL > 0) {
  const sig = await program.methods
    .fundTreasury(new anchor.BN(Math.round(FUND_SOL * LAMPORTS_PER_SOL)))
    .accounts({
      funder: payer.publicKey,
      vault,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
  console.log(`fund_treasury tx: ${sig}  (+${FUND_SOL} SOL bankroll)`);
}

console.log("");
console.log("Vault balance: ", sol(await connection.getBalance(vault)), "SOL");
console.log("Authority bal: ", sol(await connection.getBalance(payer.publicKey)), "SOL");
console.log("Done.");
