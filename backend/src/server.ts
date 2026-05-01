import "dotenv/config";
import express from "express";
import bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { z } from "zod";
import idl from "../../app/frontend/src/safechain.json" assert { type: "json" };

const rpcUrl = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(
  process.env.PROGRAM_ID ?? "CTChmby72HzRKRZ2KeytRPF4AQeVkmnW6qGNCgwLhmA6"
);
const port = Number(process.env.PORT ?? 8080);
const sponsorPubkey = new PublicKey(
  process.env.SPONSOR_PUBKEY ?? "9TJN87Q585X17aqPCiUXHcpZERJSyYzVuuZdAcauexut"
);

const app = express();
app.use(express.json());

const connection = new Connection(rpcUrl, "confirmed");

const readOnlyWallet: anchor.Wallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
};

const provider = new anchor.AnchorProvider(connection, readOnlyWallet, {
  commitment: "confirmed",
});

const getReadProgram = () => new anchor.Program(idl as anchor.Idl, provider);

const userPda = (wallet: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.toBuffer()], programId)[0];

const reviewPda = (target: PublicKey, reviewer: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("review"), target.toBuffer(), reviewer.toBuffer()],
    programId
  )[0];

app.get("/health", (_req, res) => {
  res.json({ ok: true, rpcUrl, programId: programId.toBase58() });
});

app.get("/user/:address", async (req, res) => {
  try {
    const program = getReadProgram();
    const wallet = new PublicKey(req.params.address);
    const pda = userPda(wallet);
    const user = await program.account.userAccount.fetchNullable(pda);

    const reviews = await program.account.reviewAccount.all([
      {
        memcmp: {
          offset: 8 + 32,
          bytes: wallet.toBase58(),
        },
      },
    ]);

    if (!user) {
      return res.json({
        user: {
          wallet: wallet.toBase58(),
          score: null,
          reviewCount: 0,
          lowRatingCount: 0,
          flagged: false,
          profileExists: false,
          status: "not_rated_yet",
        },
        reviews: reviews.map((r) => ({
          reviewer: r.account.reviewer.toBase58(),
          rating: r.account.rating,
          comment: r.account.comment,
          timestamp: Number(r.account.timestamp),
        })),
      });
    }

    return res.json({
      user: {
        wallet: user.wallet.toBase58(),
        score: user.score,
        reviewCount: Number(user.reviewCount),
        lowRatingCount: Number(user.lowRatingCount),
        flagged: user.flagged,
        profileExists: true,
        status: "rated",
      },
      reviews: reviews.map((r) => ({
        reviewer: r.account.reviewer.toBase58(),
        rating: r.account.rating,
        comment: r.account.comment,
        timestamp: Number(r.account.timestamp),
      })),
    });
  } catch (error) {
    return res.status(400).json({ error: "Invalid address or failed fetch", details: `${error}` });
  }
});

const backendKeypair = Keypair.generate();

app.get("/sponsor-pubkey", async (_req, res) => {
  res.json({ pubkey: backendKeypair.publicKey.toBase58() });
});

app.post("/relay", async (req, res) => {
  try {
    const { transaction } = req.body;
    if (!transaction) return res.status(400).json({ error: "Missing transaction" });

    const tx = Transaction.from(Buffer.from(transaction, "base64"));
    tx.partialSign(backendKeypair);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, ...(await connection.getLatestBlockhash()) });

    res.json({ signature });
  } catch (error) {
    console.error("Relay error:", error);
    res.status(500).json({ error: "Failed to relay transaction", details: `${error}` });
  }
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`SafeChain API listening on :${port}`);
});
