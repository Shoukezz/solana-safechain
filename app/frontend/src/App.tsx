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
    brand: "SafeChain",
    tagline: "Web3 Reputation Layer",
    subtitle: "Миттєва перевірка довіри для будь-якої адреси в блокчейні.",
    checkRep: "Перевірка репутації",
    placeholder: "Введіть адресу гаманця Solana",
    btnCheck: "Перевірити репутацію",
    btnChecking: "Перевірка...",
    resultTitle: "Результат аналізу",
    trustScore: "Рейтинг довіри",
    wallet: "Гаманець",
    reviews: "Відгуки",
    notRatedPrompt: "У цього гаманця ще немає відгуків ком'юніті. Показано базову активність.",
    recentReviews: "Останні відгуки",
    noReviews: "Відгуків ще немає.",
    leaveReview: "Залишити відгук",
    toneSafe: "Безпечно",
    toneNeutral: "Нейтрально",
    toneScam: "Шахрай (Scam)",
    commentPlaceholder: "Поділіться досвідом взаємодії з цим гаманцем",
    btnSubmit: "Надіслати відгук",
    btnSubmitting: "Надсилання...",
    errConnect: "Підключіть гаманець, щоб залишити відгук.",
    errTarget: "Введіть цільову адресу.",
    errComment: "Напишіть коментар перед відправкою.",
    msgConfirmWallet: "Підтвердіть у гаманці.",
    msgTxRejected: "Транзакцію відхилено.",
    msgWalletSignRefused: "Phantom відмовився підписати транзакцію. Спробуйте ще раз.",
    msgNoSol: "Немає SOL для оплати комісії. Поповніть спонсорський гаманець і спробуйте знову.",
    msgCooldown: "Зачекайте трохи перед наступним відгуком.",
    msgAlreadyReviewed: "Ви вже залишали відгук для цього гаманця.",
    msgSubmitFailed: "Не вдалося надіслати відгук. Оновіть сторінку та спробуйте ще раз.",
    msgConnectWallet: "Підключіть гаманець.",
    msgLoadedProfile: "Репутацію та дані мережі завантажено.",
    msgLoadedBaseline: "Адреса валідна. Обчислено базовий chain score.",
    msgInvalidAddress: "Невірна адреса гаманця Solana.",
    msgReviewCreated: "Відгук успішно створено. Tx:",
    btnOpenProfile: "Відкрити повний профіль",
    btnHideProfile: "Сховати повний профіль",
    profileTitle: "Профіль гаманця",
    avgRating: "Середній рейтинг",
    scamShare: "Частка scam",
    recent7d: "Відгуки (7 днів)",
    recent30d: "Відгуки (30 днів)",
    filterAll: "Всі",
    filterSafe: "Безпечно",
    filterNeutral: "Нейтрально",
    filterScam: "Scam",
    flaggedStatus: "Статус ризику",
    flaggedYes: "Підозрілий",
    flaggedNo: "Нормальний",
    profilePageTitle: "Детальний профіль гаманця",
    closeProfile: "Назад",
    txHistory: "Історія транзакцій",
    balanceChart: "Історія балансу",
    trustGauge: "Індекс довіри",
    status: "Статус",
    delta: "Δ SOL",
    statusInit: "Введіть адресу гаманця для аналізу.",
    riskNotRated: "Без оцінки",
    riskSafe: "Низький ризик",
    riskMedium: "Середній ризик",
    riskHigh: "Високий ризик",
    onChainMetrics: "Активність в мережі",
    balance: "Баланс",
    walletAge: "Вік гаманця",
    txCount: "Транзакції",
    days: "днів",
    txsSuffix: "транз.",
    chainScore: "Оцінка блокчейну",
    hybridNote: "Рейтинг базується на відгуках та активності в мережі."
  }
};

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={"rounded-[24px] border border-white/[0.04] bg-[#161821] p-6 shadow-2xl " + className}>
      <h2 className="mb-6 text-xs font-bold uppercase tracking-widest text-[#727B88] flex items-center">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState<"en" | "uk">("uk");
  const t = DICT[lang];

  const getRiskMeta = (score: number | null) => {
    if (score === null) return { label: t.riskNotRated, badgeClass: "bg-[#252A36] text-[#727B88] border border-[#2A303D]", scoreClass: "text-[#727B88]", progressClass: "bg-[#727B88]", scoreValue: "—", progressValue: 0 };
    if (score >= 70) return { label: t.riskSafe, badgeClass: "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20", scoreClass: "text-[#10B981]", progressClass: "bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.4)]", scoreValue: `${score}`, progressValue: score };
    if (score >= 40) return { label: t.riskMedium, badgeClass: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20", scoreClass: "text-[#F59E0B]", progressClass: "bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.4)]", scoreValue: `${score}`, progressValue: score };
    return { label: t.riskHigh, badgeClass: "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20", scoreClass: "text-[#EF4444]", progressClass: "bg-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.4)]", scoreValue: `${score}`, progressValue: score };
  };

  const { connection } = useConnection();
  const wallet = useWallet();
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    return new anchor.AnchorProvider(connection, wallet as unknown as anchor.Wallet, { commitment: "confirmed" });
  }, [connection, wallet]);

  const [target, setTarget] = useState("");
  const [reviewTone, setReviewTone] = useState<ReviewTone>("safe");
  const [comment, setComment] = useState("");
  const [targetUser, setTargetUser] = useState<UserView | null>(null);
  const [reviews, setReviews] = useState<ReviewView[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [chainStats, setChainStats] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"all" | "safe" | "neutral" | "scam">("all");
  const [txHistory, setTxHistory] = useState<TxView[]>([]);
  const [balanceSeries, setBalanceSeries] = useState<BalancePoint[]>([]);
  const [hoveredBalanceIndex, setHoveredBalanceIndex] = useState<number | null>(null);
  const balanceChartRef = useRef<HTMLDivElement | null>(null);
  const balanceSvgRef = useRef<SVGSVGElement | null>(null);

  const displayStatus = status || t.statusInit;

  const setInfo = (msg: string) => { setStatusType("info"); setStatus(msg); };
  const setSuccess = (msg: string) => { setStatusType("success"); setStatus(msg); };
  const setError = (msg: string) => { setStatusType("error"); setStatus(msg); };

  const parseError = (error: unknown) => {
    const text = `${error ?? ""}`;
    if (text.includes("rejected")) return t.msgTxRejected;
    if (text.includes("WalletSignTransactionError") || text.includes("Unexpected error")) return t.msgWalletSignRefused;
    if (
      text.includes("Attempt to debit an account") ||
      text.includes("no record of a prior credit") ||
      text.includes("insufficient funds")
    ) return t.msgNoSol;
    if (text.includes("CooldownNotPassed")) return t.msgCooldown;
    if (text.includes("already exists")) return t.msgAlreadyReviewed;
    return t.msgSubmitFailed;
  };

  const loadTarget = async () => {
    if (!provider) { setError(t.msgConnectWallet); return; }
    setIsChecking(true); setInfo(t.btnChecking);
    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const targetPda = getUserPda(targetPubkey);
      
      const fetchSignatures = async (pubkey: PublicKey) => {
        let all: any[] = [];
        let before: string | undefined = undefined;
        try {
          while (all.length < 5000) {
            const sigs = await mainnetConnection.getSignaturesForAddress(pubkey, { limit: 1000, before });
            if (sigs.length === 0) break;
            all.push(...sigs);
            before = sigs[sigs.length - 1].signature;
            if (sigs.length < 1000) break;
          }
        } catch (e) {
          console.error("Sigs fetch error:", e);
        }
        return all;
      };

      const [user, reviewAccounts, balance, sigs] = await Promise.all([
        program.account.userAccount.fetchNullable(targetPda).catch(() => null),
        program.account.reviewAccount.all([{ memcmp: { offset: 8 + 32, bytes: targetPubkey.toBase58() } }]).catch(() => []),
        mainnetConnection.getBalance(targetPubkey).catch((e) => { console.error("Balance fetch error:", e); return 0; }),
        fetchSignatures(targetPubkey)
      ]);
      
      const balanceSOL = balance / 1e9;
      const txCount = sigs.length;
      const txCountCapped = txCount >= 5000;
      const blockTime = sigs[sigs.length - 1]?.blockTime;
      const ageDays = blockTime ? Math.max(0, Math.floor((Date.now() / 1000 - blockTime) / 86400)) : 0;

      let chainScore = 0;
      if (balanceSOL > 5) chainScore += 40;
      else if (balanceSOL > 0.5) chainScore += 20;
      else if (balanceSOL > 0.05) chainScore += 10;

      if (txCount >= 5000) chainScore += 30; // Max limit reached, highly active
      else if (txCount > 500) chainScore += 20;
      else if (txCount > 50) chainScore += 10;
      else if (txCount > 0) chainScore += 5;

      if (ageDays > 180) chainScore += 30;
      else if (ageDays > 60) chainScore += 20;
      else if (ageDays > 14) chainScore += 10;

      setChainStats({ balance: balanceSOL.toFixed(2), txs: txCount, txsCapped: txCountCapped, age: ageDays, score: chainScore });

      const recent = sigs.slice(0, 120);
      if (recent.length > 0) {
        const parsed = await mainnetConnection
          .getParsedTransactions(recent.map((s: any) => s.signature), { maxSupportedTransactionVersion: 0 })
          .catch(() => []);

        const targetBase58 = targetPubkey.toBase58();
        const history: TxView[] = recent
          .map((s: any, i: number) => {
            const tx = parsed?.[i];
            if (!tx) return null;

            const keys = tx.transaction.message.accountKeys.map((k: any) =>
              "pubkey" in k ? k.pubkey.toBase58() : k.toBase58()
            );
            const idx = keys.indexOf(targetBase58);
            let deltaSol = 0;
            let balanceAfterSol: number | null = null;
            if (idx >= 0 && tx.meta?.preBalances && tx.meta?.postBalances) {
              deltaSol = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / LAMPORTS_PER_SOL;
              balanceAfterSol = tx.meta.postBalances[idx] / LAMPORTS_PER_SOL;
            }

            return {
              signature: s.signature,
              slot: tx.slot,
              time: tx.blockTime ?? s.blockTime ?? null,
              status: tx.meta?.err ? "failed" : "success",
              deltaSol,
              balanceAfterSol,
            } as TxView;
          })
          .filter(Boolean) as TxView[];

        setTxHistory(history);

        if (history.length > 0) {
          const chronological = [...history].reverse();
          const points = chronological
            .filter((h) => h.balanceAfterSol !== null)
            .map((h) => ({
              label: h.time ? new Date(h.time * 1000).toLocaleString() : `#${h.slot}`,
              value: Number((h.balanceAfterSol as number).toFixed(4)),
            }));

          const currentPoint: BalancePoint = { label: "Now", value: Number(balanceSOL.toFixed(4)) };
          const series: BalancePoint[] = points.length > 0 ? [...points] : [currentPoint];
          const last = series[series.length - 1];
          if (!last || (last.label !== "Now" && Math.abs(last.value - currentPoint.value) > 0.0001)) {
            series.push(currentPoint);
          } else if (last && last.label === "Now") {
            last.value = currentPoint.value;
          }

          setBalanceSeries(series);
        } else {
          setBalanceSeries([{ label: "Now", value: Number(balanceSOL.toFixed(4)) }]);
        }
      } else {
        setTxHistory([]);
        setBalanceSeries([{ label: "Now", value: Number(balanceSOL.toFixed(4)) }]);
      }

      const userProfileScore = user ? Number(user.score) : null;
      let finalScore = chainScore;
      if (userProfileScore !== null) {
          // If community thinks it's a scam (<40), hard limit the score 
          if (userProfileScore < 40) finalScore = Math.min(chainScore, userProfileScore);
          else finalScore = Math.floor((chainScore * 0.7) + (userProfileScore * 0.3));        }

      setTargetUser({
        wallet: targetPubkey.toBase58(),
        score: finalScore,        reviewCount: user ? Number(user.reviewCount) : 0,
        lowRatingCount: user ? Number(user.lowRatingCount) : 0,
        flagged: user ? user.flagged : false,
        profileExists: !!user
      });

  return <div>SafeChain UI Setup</div>;
}
