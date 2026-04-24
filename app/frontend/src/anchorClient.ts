import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "./safechain.json";

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID ?? "CTChmby72HzRKRZ2KeytRPF4AQeVkmnW6qGNCgwLhmA6"
);

export const RPC_URL = import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";

export const getProgram = (provider: anchor.AnchorProvider) =>
  new Program(idl as unknown as anchor.Idl, provider);

export const getUserPda = (wallet: PublicKey) =>
  PublicKey.findProgramAddressSync([Buffer.from("user"), wallet.toBuffer()], PROGRAM_ID)[0];

export const getReviewPda = (target: PublicKey, reviewer: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("review"), target.toBuffer(), reviewer.toBuffer()],
    PROGRAM_ID
  )[0];
