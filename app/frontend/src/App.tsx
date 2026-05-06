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
  const [lang, setLang] = useState<"en" | "uk">("en");
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
  const [statusGetter, setStatusGetter] = useState<((t: any) => string) | null>(null);
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

  const displayStatus = statusGetter ? statusGetter(t) : t.statusInit;

  const setInfo = (fn: (t: any) => string) => { setStatusType("info"); setStatusGetter(() => fn); };
  const setSuccess = (fn: (t: any) => string) => { setStatusType("success"); setStatusGetter(() => fn); };
  const setError = (fn: (t: any) => string) => { setStatusType("error"); setStatusGetter(() => fn); };

  const parseError = (error: unknown) => {
    const text = `${error ?? ""}`;
    if (text.includes("rejected")) return (t: any) => t.msgTxRejected;
    if (text.includes("WalletSignTransactionError") || text.includes("Unexpected error")) return (t: any) => t.msgWalletSignRefused;
    if (
      text.includes("Attempt to debit an account") ||
      text.includes("no record of a prior credit") ||
      text.includes("insufficient funds")
    ) return (t: any) => t.msgNoSol;
    if (text.includes("CooldownNotPassed")) return (t: any) => t.msgCooldown;
    if (text.includes("already exists")) return (t: any) => t.msgAlreadyReviewed;
    return (t: any) => t.msgSubmitFailed;
  };

  const loadTarget = async () => {
    if (!provider) { setError(t => t.msgConnectWallet); return; }
    setIsChecking(true); setInfo(t => t.btnChecking);
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

      setReviews(reviewAccounts.map((r: any) => ({ reviewer: r.account.reviewer.toBase58(), rating: r.account.rating, comment: r.account.comment, timestamp: Number(r.account.timestamp) })).sort((a: ReviewView, b: ReviewView) => b.timestamp - a.timestamp));

      setSuccess(t => user ? t.msgLoadedProfile : t.msgLoadedBaseline);
    } catch (e) {
      console.error(e);
      setError(t => t.msgInvalidAddress); setTargetUser(null); setReviews([]); setChainStats(null); setTxHistory([]); setBalanceSeries([]);
    } finally { setIsChecking(false); }
  };

  const submitReview = async () => {
    if (!provider || !wallet.publicKey) { setError(t => t.errConnect); return; }
    if (!target.trim()) { setError(t => t.errTarget); return; }
    if (!comment.trim()) { setError(t => t.errComment); return; }
    setIsSubmitting(true); setInfo(t => `${t.btnSubmitting} ${t.msgConfirmWallet}`);

    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const reviewerUser = getUserPda(wallet.publicKey);
      const targetUserPda = getUserPda(targetPubkey);
      const review = getReviewPda(targetPubkey, wallet.publicKey);
      const sponsor = getSponsorKeypair();

      const sponsorBalance = await connection.getBalance(sponsor.publicKey, "confirmed");
      if (sponsorBalance < 0.01 * LAMPORTS_PER_SOL) {
        throw new Error("insufficient funds: sponsor wallet");
      }

      const tx = new Transaction();

      tx.feePayer = sponsor.publicKey;

      const existingReviewer = await program.account.userAccount.fetchNullable(reviewerUser);
      console.log("existingReviewer:", existingReviewer);

      if (!existingReviewer) {
        console.log("Creating user for:", wallet.publicKey.toBase58());
        const createUserIx = await program.methods
          .createUser()
          .accounts({
            authority: wallet.publicKey,
            payer: sponsor.publicKey,
            user: reviewerUser,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(createUserIx);
      }

      console.log("Adding addReview instruction.");
      const addReviewIx = await program.methods
        .addReview(toneToRating[reviewTone], comment)
        .accounts({
          reviewer: wallet.publicKey,
          payer: sponsor.publicKey,
          reviewerUser,
          target: targetPubkey,
          targetUser: targetUserPda,
          review,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      tx.add(addReviewIx);

      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      console.log("Got blockhash:", latestBlockhash.blockhash);
      tx.recentBlockhash = latestBlockhash.blockhash;
      

      console.log("Prompting wallet to sign...");
      tx.partialSign(sponsor);
      const signedTx = await wallet.signTransaction!(tx);
      console.log("Wallet signed:", signedTx);

      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, "confirmed");

      setComment(""); setReviewTone("safe"); 
      setSuccess(t => `✅ ${t.msgReviewCreated} ${sig.slice(0, 8)}...${sig.slice(-8)}`);
      await loadTarget();
    } catch (error) {
      console.error(error);
      setError(parseError(error));
    } finally { setIsSubmitting(false); }
  };

  const riskMeta = targetUser ? getRiskMeta(targetUser.score) : null;
  const filteredReviews = reviews.filter((r) =>
    reviewFilter === "all"
      ? true
      : reviewFilter === "safe"
        ? r.rating >= 4
        : reviewFilter === "neutral"
          ? r.rating === 3
          : r.rating <= 2
  );
  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : "0.00";
  const scamShare = reviews.length ? Math.round((reviews.filter((r) => r.rating <= 2).length / reviews.length) * 100) : 0;
  const nowSec = Date.now() / 1000;
  const reviews7d = reviews.filter((r) => nowSec - r.timestamp <= 7 * 86400).length;
  const reviews30d = reviews.filter((r) => nowSec - r.timestamp <= 30 * 86400).length;
  const gaugeScore = Math.max(0, Math.min(100, targetUser?.score ?? 0));
  const gaugeAngleRad = Math.PI * (1 - gaugeScore / 100);
  const gaugeCx = 180;
  const gaugeCy = 180;
  const gaugeR = 116;
  const dirX = Math.cos(gaugeAngleRad);
  const dirY = -Math.sin(gaugeAngleRad);
  const needleTipX = gaugeCx + dirX * (gaugeR - 10);
  const needleTipY = gaugeCy + dirY * (gaugeR - 10);
  const needleTailX = gaugeCx - dirX * 18;
  const needleTailY = gaugeCy - dirY * 18;
  const perpX = -dirY;
  const perpY = dirX;
  const needleLeftX = needleTailX + perpX * 6;
  const needleLeftY = needleTailY + perpY * 6;
  const needleRightX = needleTailX - perpX * 6;
  const needleRightY = needleTailY - perpY * 6;
  const chartValues = balanceSeries.map((p) => p.value);
  const minV = chartValues.length ? Math.min(...chartValues) : 0;
  const maxV = chartValues.length ? Math.max(...chartValues) : 1;
  const chartPoints = balanceSeries
    .map((p, i) => {
      const x = balanceSeries.length > 1 ? (i / (balanceSeries.length - 1)) * 100 : 0;
      const y = maxV === minV ? 50 : 100 - ((p.value - minV) / (maxV - minV)) * 100;
      return `${x},${y}`;
    })
    .join(" ");
  const chartData = balanceSeries.map((p, i) => {
    const x = balanceSeries.length > 1 ? (i / (balanceSeries.length - 1)) * 100 : 0;
    const y = maxV === minV ? 50 : 100 - ((p.value - minV) / (maxV - minV)) * 100;
    return { ...p, x, y };
  });
  const hoveredPoint = hoveredBalanceIndex !== null ? chartData[hoveredBalanceIndex] : null;
  const chartSvgW = 1000;
  const chartSvgH = 360;
  const chartPadX = 68;
  const chartPadY = 26;
  const chartPlotW = chartSvgW - chartPadX * 2;
  const chartPlotH = chartSvgH - chartPadY * 2;
  const chartPlotData = chartData.map((p) => ({
    ...p,
    sx: chartPadX + (p.x / 100) * chartPlotW,
    sy: chartPadY + (p.y / 100) * chartPlotH,
  }));
  const chartLinePath = chartPlotData
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.sx} ${p.sy}`)
    .join(" ");
  const chartAreaPath = chartPlotData.length
    ? `${chartLinePath} L ${chartPadX + chartPlotW} ${chartPadY + chartPlotH} L ${chartPadX} ${chartPadY + chartPlotH} Z`
    : "";
  const hoveredPlotPoint = hoveredBalanceIndex !== null ? chartPlotData[hoveredBalanceIndex] : null;
  const yTicks = [0, 1, 2, 3, 4].map((i) => {
    const ratio = i / 4;
    const value = maxV - (maxV - minV) * ratio;
    const y = chartPadY + chartPlotH * ratio;
    return { y, value };
  });

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white selection:bg-[#3260F3]/30 font-sans">
      {/* Header Pipeline */}
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#0B0E14]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <img src="/logo.png" alt="SafeChain Logo" className="w-10 h-10 rounded-[10px]" />
              {t.brand}
            </h1>
            <span className="hidden md:inline-flex items-center rounded-lg bg-white/[0.05] border border-white/[0.05] px-3 py-1 text-xs font-semibold text-[#727B88]">{t.tagline}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] border border-white/[0.05] bg-[#161821] text-xs font-bold text-[#A8B2C1] hover:bg-[#1A1D27] hover:text-white transition">
                <span>{lang === "uk" ? "🇺🇦 UK" : "🇬🇧 EN"}</span>
                <svg className="w-3 h-3 text-[#727B88]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-36 origin-top-right rounded-[16px] border border-white/[0.05] bg-[#161821] p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-2xl backdrop-blur-xl">
                <button
                  onClick={() => setLang("uk")}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-xs font-bold transition ${lang === "uk" ? "bg-[#3260F3]/10 text-[#3260F3]" : "text-[#A8B2C1] hover:bg-white/[0.04] hover:text-white"}`}
                >
                  <span>🇺🇦</span> Українська
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-xs font-bold transition ${lang === "en" ? "bg-[#3260F3]/10 text-[#3260F3]" : "text-[#A8B2C1] hover:bg-white/[0.04] hover:text-white"}`}
                >
                  <span>🇬🇧</span> English
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {wallet.wallet && !wallet.connected && (
                <button
                  onClick={() => {
                    try { wallet.select(null as any); } catch {}
                    localStorage.removeItem('walletName');
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/[0.05] bg-[#161821] text-[#727B88] hover:bg-[#EF4444]/10 hover:border-[#EF4444]/30 hover:text-[#EF4444] transition"
                  title="Отменить выбор кошелька"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              <WalletMultiButton className="!bg-[#3260F3] hover:!bg-[#284DD4] !h-10 !text-xs !font-bold !px-5 !rounded-[12px] !transition" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Architecture */}
      <main className="max-w-7xl mx-auto p-6 md:py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* Left Column: Context & Results */}
        <div className="space-y-6">
          
          <div>
            <h2 className="text-[32px] sm:text-[40px] font-extrabold tracking-tight text-white leading-tight">
              {t.checkRep}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#A8B2C1] font-medium">{t.subtitle}</p>
          </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#3260F3] to-[#25BDDF] rounded-full blur opacity-20 group-hover:opacity-30 transition duration-500"></div>
              <div className="relative flex flex-col sm:flex-row gap-3 bg-[#11131A] rounded-3xl sm:rounded-full p-2.5 border border-white/[0.04]">
                <input
                  className="flex-1 bg-transparent px-5 py-3 text-sm font-semibold text-white placeholder:text-[#525B69] outline-none"
                  placeholder={t.placeholder}
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setShowProfile(false);
                    setStatusGetter(null); // Reset status when typing
                    setStatusType("info");
                  }}
                />
                <button
                  className="rounded-full bg-[#3260F3] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#3260F3]/25 transition-all hover:scale-[1.02] hover:bg-[#284DD4] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={loadTarget}
                  disabled={isChecking || !target.trim()}
                >
                  {isChecking ? t.btnChecking : t.btnCheck}
                </button>
              </div>
            </div>

            {displayStatus && (
              <div className={`rounded-[16px] border px-5 py-4 text-sm font-semibold flex items-center gap-3 backdrop-blur-md ${
                statusType === "success" ? "border-[#10B981]/20 bg-[#10B981]/10 text-[#10B981]" :
                statusType === "error" ? "border-[#EF4444]/20 bg-[#EF4444]/10 text-[#EF4444]" :
                "border-white/[0.05] bg-[#161821]/80 text-[#727B88]"
              }`}>
                <div className={`w-2 h-2 rounded-full ${statusType === "success" ? "bg-[#10B981]" : statusType === "error" ? "bg-[#EF4444]" : "bg-[#727B88]"}`} />
                {displayStatus}
              </div>
            )}

          {targetUser && riskMeta && (
            <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700 fade-in zoom-in-95">
              <Card title={t.resultTitle} className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#3260F3] opacity-[0.03] blur-[80px] rounded-full pointer-events-none"></div>
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <p className="text-sm font-semibold tracking-wide text-[#727B88] mb-2">{t.trustScore}</p>
                    <p className={`text-6xl font-extrabold tracking-tighter ${riskMeta.scoreClass}`}>{riskMeta.scoreValue}</p>
                  </div>
                  <span className={`rounded-full border px-5 py-2 text-sm font-bold shadow-sm ${riskMeta.badgeClass}`}>
                    {riskMeta.label}
                  </span>
                </div>
                <div className="mt-8 h-2.5 overflow-hidden rounded-full bg-[#1A1D27] border border-white/[0.02]">
                  <div className={`h-full rounded-full transition-all duration-1000 ease-out ${riskMeta.progressClass}`} style={{ width: `${riskMeta.progressValue}%` }} />
                </div>
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]">
                    <p className="text-xs font-semibold text-[#727B88]">{t.wallet}</p>
                    <p className="mt-2 font-mono text-sm font-bold text-white tracking-widest">{shortAddress(targetUser.wallet)}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]">
                    <p className="text-xs font-semibold text-[#727B88]">{t.reviews}</p>
                    <p className="mt-2 text-sm font-bold text-white">{targetUser.reviewCount}</p>
                  </div>
                </div>
                {!targetUser.profileExists && <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {t.notRatedPrompt}</p>}
                <button
                  onClick={() => setShowProfile((v) => !v)}
                  className="mt-5 w-full h-11 rounded-[12px] bg-[#11131A] border border-white/[0.06] text-sm font-bold text-[#A8B2C1] hover:text-white hover:border-[#3260F3]/40 transition"
                >
                  {showProfile ? t.btnHideProfile : t.btnOpenProfile}
                </button>
              </Card>

              {chainStats && (
              <Card title={t.onChainMetrics}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-none rounded-[16px] bg-[#11131A] p-5 border border-white/[0.04] sm:w-36 flex flex-col justify-center items-center text-center">
                    <p className="text-xs font-semibold text-[#727B88] mb-2">{t.chainScore}</p>
                    <p className="text-4xl font-extrabold text-[#3260F3]">{chainStats.score}</p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-[16px] bg-[#11131A] p-5 border border-white/[0.04]">
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-semibold text-[#727B88] mb-1.5">{t.balance}</p>
                      <p className="font-mono text-base font-bold text-white">{chainStats.balance} <span className="text-[#3260F3] text-sm">SOL</span></p>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-semibold text-[#727B88] mb-1.5">{t.txCount}</p>
                      <p className="font-mono text-base font-bold text-white">{chainStats.txsCapped ? `${chainStats.txs}+` : chainStats.txs} <span className="text-[#A8B2C1] text-xs uppercase ml-1 tracking-wider">{t.txsSuffix}</span></p>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-semibold text-[#727B88] mb-1.5">{t.walletAge}</p>
                      <p className="font-mono text-base font-bold text-white">{chainStats.age} <span className="text-[#A8B2C1] text-xs uppercase ml-1 tracking-wider">{t.days}</span></p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-5 border-t border-white/[0.04] flex items-start sm:items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-[#3260F3]/10">
                    <svg className="w-4 h-4 text-[#3260F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-xs font-medium text-[#727B88]">{t.hybridNote}</p>
                </div>
              </Card>
              )}

              <Card title={t.recentReviews}>
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-[16px] bg-[#11131A]/50">
                      <p className="text-sm font-semibold text-[#727B88]">{t.noReviews}</p>
                    </div>
                  ) : (
                    reviews.slice(0, 5).map((r, i) => (
                      <div key={i} className="rounded-[16px] bg-[#11131A] p-5 border border-white/[0.02] hover:border-white/[0.08] transition duration-300">
                        <div className="flex justify-between items-center mb-3">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[8px] text-xs font-bold ${
                            r.rating >= 4 ? 'bg-[#10B981]/10 text-[#10B981]' : r.rating === 3 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                          }`}>{r.rating} / 5</span>
                          <span className="text-xs font-medium text-[#727B88] bg-white/[0.02] px-3 py-1 rounded-full">{new Date(r.timestamp * 1000).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[15px] font-medium leading-relaxed text-white">{r.comment}</p>
                        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#3260F3] to-[#A8B2C1]"></div>
                          <p className="text-xs font-bold font-mono text-[#727B88]">{shortAddress(r.reviewer)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>


            </div>
          )}
        </div>

        {/* Right Column: Interaction */}
        <div className="sticky top-[90px]">
          <Card title={t.leaveReview}>
            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-[#727B88] mb-3 block">Rating Tone</label>
                <select
                  className="w-full h-12 rounded-[12px] border border-white/[0.06] bg-[#11131A] px-4 text-sm font-bold text-white outline-none focus:border-[#3260F3] focus:ring-1 focus:ring-[#3260F3] transition"
                  value={reviewTone}
                  onChange={(e) => setReviewTone(e.target.value as ReviewTone)}
                >
                  <option value="safe" className="font-semibold text-[#10B981] bg-[#161821]">🟢 {t.toneSafe}</option>
                  <option value="neutral" className="font-semibold text-[#F59E0B] bg-[#161821]">🟡 {t.toneNeutral}</option>
                  <option value="scam" className="font-semibold text-[#EF4444] bg-[#161821]">🔴 {t.toneScam}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-[#727B88] mb-3 block">Comment</label>
                <textarea
                  className="min-h-[160px] w-full rounded-[16px] border border-white/[0.06] bg-[#11131A] p-4 text-sm font-medium text-white placeholder:text-[#525B69] outline-none focus:border-[#3260F3] focus:ring-1 focus:ring-[#3260F3] resize-none transition"
                  placeholder={t.commentPlaceholder}
                  value={comment}
                  maxLength={280}
                  onChange={(e) => setComment(e.target.value)}
                />
                <div className="text-right mt-2 text-xs font-semibold text-[#525B69]">{comment.length}/280</div>
              </div>

              <button
                className="w-full h-14 rounded-[16px] bg-gradient-to-r from-[#3260F3] to-[#25BDDF] text-[15px] font-extrabold text-white shadow-lg shadow-[#3260F3]/25 transition hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitReview}
                disabled={isSubmitting || !wallet.connected || !target.trim() || !comment.trim()}
              >
                {isSubmitting ? t.btnSubmitting : t.btnSubmit}
              </button>

              {(!wallet.connected || !target.trim() || !comment.trim()) && (
                <div className="p-2 flex justify-center text-center">
                  <p className="text-[12px] font-medium text-[#727B88]">
                    {!wallet.connected ? t.errConnect : !target.trim() ? t.errTarget : t.errComment}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

      </main>

      {showProfile && targetUser && riskMeta && (
        <div className="fixed inset-0 z-[70] bg-[#0B0E14]/95 backdrop-blur-md overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 md:py-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t.profilePageTitle}</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="h-10 px-4 rounded-[12px] border border-white/[0.08] bg-[#161821] text-sm font-bold text-[#A8B2C1] hover:text-white"
              >
                {t.closeProfile}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
              <Card title={t.balanceChart}>
                <div
                  ref={balanceChartRef}
                  className="rounded-[16px] bg-[#11131A] border border-white/[0.04] p-4"
                  onMouseLeave={() => setHoveredBalanceIndex(null)}
                  onMouseMove={(e) => {
                    if (!balanceSvgRef.current || chartPlotData.length === 0) return;
                    const rect = balanceSvgRef.current.getBoundingClientRect();
                    const xSvg = ((e.clientX - rect.left) / rect.width) * chartSvgW;
                    const xClamped = Math.max(chartPadX, Math.min(chartPadX + chartPlotW, xSvg));
                    let nearest = 0;
                    let bestDist = Number.POSITIVE_INFINITY;
                    chartPlotData.forEach((p, i) => {
                      const dist = Math.abs(p.sx - xClamped);
                      if (dist < bestDist) {
                        bestDist = dist;
                        nearest = i;
                      }
                    });
                    setHoveredBalanceIndex(nearest);
                  }}
                >
                  <div className="relative cursor-crosshair">
                    <svg ref={balanceSvgRef} viewBox={`0 0 ${chartSvgW} ${chartSvgH}`} className="w-full h-64">
                      <defs>
                        <linearGradient id="balanceLine" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#3260F3" />
                          <stop offset="50%" stopColor="#25BDDF" />
                          <stop offset="100%" stopColor="#10B981" />
                        </linearGradient>
                        <linearGradient id="balanceArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#25BDDF" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#25BDDF" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      <rect x={chartPadX} y={chartPadY} width={chartPlotW} height={chartPlotH} fill="#0d1220" opacity="0.45" rx="10" />
                      {yTicks.map((tick, idx) => (
                        <g key={idx}>
                          <line x1={chartPadX} y1={tick.y} x2={chartPadX + chartPlotW} y2={tick.y} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                          <text x={chartPadX - 12} y={tick.y + 4} textAnchor="end" fill="#6b7280" fontSize="12" fontWeight="600">
                            {tick.value.toFixed(2)}
                          </text>
                        </g>
                      ))}

                      {chartAreaPath && <path d={chartAreaPath} fill="url(#balanceArea)" />}
                      {chartLinePath && <path d={chartLinePath} fill="none" stroke="url(#balanceLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}

                      {chartPlotData.map((p, i) => (
                        <circle key={i} cx={p.sx} cy={p.sy} r="2.6" fill="#9EC5FF" opacity="0.9" />
                      ))}

                      {hoveredPlotPoint && (
                        <>
                          <line x1={hoveredPlotPoint.sx} y1={chartPadY} x2={hoveredPlotPoint.sx} y2={chartPadY + chartPlotH} stroke="rgba(141,176,255,0.55)" strokeWidth="1" strokeDasharray="5 5" />
                          <circle cx={hoveredPlotPoint.sx} cy={hoveredPlotPoint.sy} r="6" fill="rgba(141,176,255,0.2)" />
                          <circle cx={hoveredPlotPoint.sx} cy={hoveredPlotPoint.sy} r="4" fill="#8DB0FF" />
                        </>
                      )}

                      <text x={chartPadX} y={chartSvgH - 10} fill="#6b7280" fontSize="12" fontWeight="600">{balanceSeries[0]?.label ?? "Start"}</text>
                      <text x={chartPadX + chartPlotW} y={chartSvgH - 10} textAnchor="end" fill="#6b7280" fontSize="12" fontWeight="600">{balanceSeries[balanceSeries.length - 1]?.label ?? "Now"}</text>
                    </svg>
                    {hoveredPlotPoint && (
                      <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[108%] rounded-xl border border-white/[0.12] bg-[#0F1320]/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"
                        style={{ left: `${(hoveredPlotPoint.sx / chartSvgW) * 100}%`, top: `${(hoveredPlotPoint.sy / chartSvgH) * 100}%` }}
                      >
                        <p className="text-white font-bold">{hoveredPlotPoint.value.toFixed(4)} SOL</p>
                        <p className="text-[#A8B2C1]">{hoveredPlotPoint.label}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[#727B88]">
                    <span>Min: {minV.toFixed(3)} SOL</span>
                    <span>Max: {maxV.toFixed(3)} SOL</span>
                  </div>
                </div>
              </Card>

              <Card title={t.trustGauge}>
                <div className="rounded-[16px] bg-[#11131A] border border-white/[0.04] p-4 flex flex-col items-center">
                  <svg viewBox="0 0 360 240" className="w-full max-w-[390px] h-auto">
                    <defs>
                      <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                      <linearGradient id="gaugeFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="30%" stopColor="#f97316" />
                        <stop offset="55%" stopColor="#f59e0b" />
                        <stop offset="78%" stopColor="#84cc16" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>

                    <path d="M64 180 A116 116 0 0 1 296 180" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="20" strokeLinecap="round" />
                    <path d="M64 180 A116 116 0 0 1 296 180" fill="none" stroke="url(#gaugeFlow)" strokeWidth="14" strokeLinecap="round" />

                    <line x1="64" y1="180" x2="74" y2="180" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="109" y1="96" x2="116" y2="102" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="180" y1="64" x2="180" y2="74" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="251" y1="96" x2="244" y2="102" stroke="#94a3b8" strokeWidth="2" />
                    <line x1="296" y1="180" x2="286" y2="180" stroke="#94a3b8" strokeWidth="2" />

                    <polygon
                      points={`${needleTipX},${needleTipY} ${needleLeftX},${needleLeftY} ${needleRightX},${needleRightY}`}
                      fill="#f8fafc"
                      filter="url(#needleGlow)"
                    />
                    <circle cx={gaugeCx} cy={gaugeCy} r="10" fill="#f8fafc" />
                    <circle cx={gaugeCx} cy={gaugeCy} r="4" fill="#0b0e14" />

                    <text x="64" y="197" textAnchor="middle" fill="#727B88" fontSize="11" fontWeight="700">0</text>
                    <text x="122" y="144" textAnchor="middle" fill="#727B88" fontSize="11" fontWeight="700">25</text>
                    <text x="180" y="126" textAnchor="middle" fill="#727B88" fontSize="11" fontWeight="700">50</text>
                    <text x="238" y="144" textAnchor="middle" fill="#727B88" fontSize="11" fontWeight="700">75</text>
                    <text x="296" y="197" textAnchor="middle" fill="#727B88" fontSize="11" fontWeight="700">100</text>
                  </svg>
                  <p className={`mt-2 text-5xl font-extrabold ${riskMeta.scoreClass}`}>{riskMeta.scoreValue}</p>
                  <span className={`mt-2 rounded-full border px-4 py-1 text-xs font-bold ${riskMeta.badgeClass}`}>{riskMeta.label}</span>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]"><p className="text-xs text-[#727B88]">{t.avgRating}</p><p className="mt-1 text-xl font-bold">{avgRating}</p></div>
              <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]"><p className="text-xs text-[#727B88]">{t.scamShare}</p><p className="mt-1 text-xl font-bold">{scamShare}%</p></div>
              <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]"><p className="text-xs text-[#727B88]">{t.recent7d}</p><p className="mt-1 text-xl font-bold">{reviews7d}</p></div>
              <div className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.04]"><p className="text-xs text-[#727B88]">{t.recent30d}</p><p className="mt-1 text-xl font-bold">{reviews30d}</p></div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card title={t.recentReviews}>
                <div className="mb-4 flex flex-wrap gap-2">
                  {([
                    ["all", t.filterAll],
                    ["safe", t.filterSafe],
                    ["neutral", t.filterNeutral],
                    ["scam", t.filterScam],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setReviewFilter(key)}
                      className={`h-9 px-4 rounded-[10px] text-xs font-bold border transition ${reviewFilter === key ? "bg-[#3260F3]/15 border-[#3260F3]/40 text-[#8DB0FF]" : "bg-[#11131A] border-white/[0.06] text-[#A8B2C1] hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {filteredReviews.length === 0 ? (
                    <div className="py-8 text-center border border-dashed border-white/[0.05] rounded-[16px] bg-[#11131A]/50">
                      <p className="text-sm font-semibold text-[#727B88]">{t.noReviews}</p>
                    </div>
                  ) : (
                    filteredReviews.map((r, i) => (
                      <div key={`${r.reviewer}-${r.timestamp}-${i}`} className="rounded-[16px] bg-[#11131A] p-4 border border-white/[0.02]">
                        <div className="flex justify-between items-center mb-2">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-[8px] text-xs font-bold ${
                            r.rating >= 4 ? 'bg-[#10B981]/10 text-[#10B981]' : r.rating === 3 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                          }`}>{r.rating} / 5</span>
                          <span className="text-xs font-medium text-[#727B88]">{new Date(r.timestamp * 1000).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-white">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card title={t.txHistory}>
                <div className="max-h-[470px] overflow-y-auto pr-1">
                  <table className="w-full text-sm">
                    <thead className="text-[#727B88] text-xs uppercase">
                      <tr>
                        <th className="text-left pb-2">Tx</th>
                        <th className="text-left pb-2">{t.status}</th>
                        <th className="text-right pb-2">{t.delta}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txHistory.length === 0 ? (
                        <tr><td className="py-6 text-[#727B88]" colSpan={3}>{t.noReviews}</td></tr>
                      ) : txHistory.map((tx) => (
                        <tr key={tx.signature} className="border-t border-white/[0.04]">
                          <td className="py-3 font-mono text-xs">{shortAddress(tx.signature)}</td>
                          <td className={`py-3 text-xs font-bold ${tx.status === "success" ? "text-[#10B981]" : "text-[#EF4444]"}`}>{tx.status}</td>
                          <td className={`py-3 text-right font-mono text-xs ${tx.deltaSol >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>{tx.deltaSol >= 0 ? "+" : ""}{tx.deltaSol.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
