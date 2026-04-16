import { useMemo, useState, useRef, type ReactNode } from "react";
import * as anchor from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, Keypair, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const MAINNET_RPC = "https://rpc.magicblock.app/mainnet";
const mainnetConnection = new Connection(MAINNET_RPC, "confirmed");

import { getProgram, getReviewPda, getUserPda } from "./anchorClient";
import sponsorJson from "./sponsor.json";

const sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorJson));
const getSponsorKeypair = () => sponsorKeypair;

type UserView = { wallet: string; score: number | null; reviewCount: number; lowRatingCount: number; flagged: boolean; profileExists: boolean; };
type ReviewView = { reviewer: string; rating: number; comment: string; timestamp: number; };
type TxView = { signature: string; slot: number; time: number | null; status: "success" | "failed"; deltaSol: number; balanceAfterSol: number | null; };
type BalancePoint = { label: string; value: number; };
type ReviewTone = "safe" | "neutral" | "scam";

const toneToRating: Record<ReviewTone, number> = { safe: 5, neutral: 3, scam: 1 };

const shortAddress = (value: string) => `${value.slice(0, 4)}...${value.slice(-4)}`;


const DICT = {
  en: {
    brand: "SafeChain",
    tagline: "Web3 Reputation Layer",
    subtitle: "Instant on-chain trust check for any wallet address.",
    checkRep: "Check wallet reputation",
    placeholder: "Enter Solana wallet address",
    btnCheck: "Check Reputation",
    btnChecking: "Checking...",
    resultTitle: "Analysis Result",
    trustScore: "Trust Score",
    wallet: "Wallet",
    reviews: "Reviews",
    notRatedPrompt: "This wallet has no community reviews. Showing baseline chain activity.",
    recentReviews: "Recent Reviews",
    noReviews: "No reviews yet.",
    leaveReview: "Leave a Review",
    toneSafe: "Safe",
    toneNeutral: "Neutral",
    toneScam: "Scam",
    commentPlaceholder: "Share your experience with this wallet",
    btnSubmit: "Submit Review",
    btnSubmitting: "Submitting...",
    errConnect: "Connect wallet to submit a review.",
    errTarget: "Enter a target address to review.",
    errComment: "Write a comment before submitting.",
    msgConfirmWallet: "Confirm in wallet.",
    msgTxRejected: "Transaction rejected.",
    msgWalletSignRefused: "Phantom refused to sign this transaction format. Try again now (wallet is set as fee payer).",
    msgNoSol: "Fee payer has no SOL for fees. Fund sponsor wallet and retry.",
    msgCooldown: "Please wait before sending another review.",
    msgAlreadyReviewed: "You already reviewed this wallet.",
    msgSubmitFailed: "Failed to submit review. Refresh and try again.",
    msgConnectWallet: "Connect wallet.",
    msgLoadedProfile: "Reputation and chain data loaded.",
    msgLoadedBaseline: "Address is valid. Baseline chain score computed.",
    msgInvalidAddress: "Invalid Solana wallet address.",
    msgReviewCreated: "Review submitted. Tx:",
    btnOpenProfile: "Open full profile",
    btnHideProfile: "Hide full profile",
    profileTitle: "Wallet Profile",
    avgRating: "Average Rating",
    scamShare: "Scam Share",
    recent7d: "Reviews (7d)",
    recent30d: "Reviews (30d)",
    filterAll: "All",
    filterSafe: "Safe",
    filterNeutral: "Neutral",
    filterScam: "Scam",
    flaggedStatus: "Flagged status",
    flaggedYes: "Flagged",
    flaggedNo: "Normal",
    profilePageTitle: "Wallet profile details",
    closeProfile: "Back",
    txHistory: "Transaction History",
    balanceChart: "Balance History",
    trustGauge: "Trust Index",
    status: "Status",
    delta: "Δ SOL",
    statusInit: "Enter a wallet address to begin analysis.",
    riskNotRated: "Unrated",
    riskSafe: "Low Risk",
    riskMedium: "Medium Risk",
    riskHigh: "High Risk",
    onChainMetrics: "On-Chain Activity",
    balance: "Balance",
    walletAge: "Wallet Age",
    txCount: "Transactions",
    days: "days",
    txsSuffix: "txs",
    chainScore: "On-Chain Score",
    hybridNote: "Score is based on community reviews and on-chain activity."
  },
  uk: {
export default function App() {
  return <div>SafeChain Skeleton</div>;
}
