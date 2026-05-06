const fs = require('fs');

const code = `import { useMemo, useState, type ReactNode } from "react";
import * as anchor from "@coral-xyz/anchor";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import { getProgram, getReviewPda, getUserPda } from "./anchorClient";
import sponsorJson from "./sponsor.json";

const sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorJson));
const getSponsorKeypair = () => sponsorKeypair;

type UserView = { wallet: string; score: number | null; reviewCount: number; lowRatingCount: number; flagged: boolean; profileExists: boolean; };
type ReviewView = { reviewer: string; rating: number; comment: string; timestamp: number; };
type ReviewTone = "safe" | "neutral" | "scam";

const toneToRating: Record<ReviewTone, number> = { safe: 5, neutral: 3, scam: 1 };

const shortAddress = (value: string) => \`\${value.slice(0, 4)}...\${value.slice(-4)}\`;

const DICT = {
  en: {
    brand: "SafeChain",
    tagline: "Solana Reputation Layer",
    subtitle: "Instant on-chain trust check for any wallet address.",
    checkRep: "Check wallet reputation",
    placeholder: "Enter Solana wallet address",
    btnCheck: "Check Reputation",
    btnChecking: "Checking...",
    resultTitle: "Reputation Result",
    trustScore: "Trust Score",
    wallet: "Wallet",
    reviews: "Reviews",
    notRatedPrompt: "This wallet is not rated yet. Be the first to submit a review.",
    recentReviews: "Recent Reviews",
    noReviews: "No reviews yet.",
    leaveReview: "Leave a Review",
    toneSafe: "Safe",
    toneNeutral: "Neutral",
    toneScam: "Scam",
    commentPlaceholder: "Share your experience with this wallet",
    btnSubmit: "Submit Review",
    btnSubmitting: "Submitting...",
    errConnect: "Connect wallet to submit.",
    errTarget: "Enter target address first.",
    errComment: "Write a comment to enable submit.",
    statusInit: "Enter a wallet address to begin.",
    riskNotRated: "Not Rated Yet",
    riskSafe: "Safe",
    riskMedium: "Medium",
    riskHigh: "High Risk"
  },
  uk: {
    brand: "SafeChain",
    tagline: "Рівень репутації Solana",
    subtitle: "Миттєва перевірка довіри для будь-якої адреси в блокчейні.",
    checkRep: "Перевірка репутації",
    placeholder: "Введіть адресу гаманця Solana",
    btnCheck: "Перевірити репутацію",
    btnChecking: "Перевірка...",
    resultTitle: "Результат перевірки",
    trustScore: "Рейтинг довіри",
    wallet: "Гаманець",
    reviews: "Відгуки",
    notRatedPrompt: "Цей гаманець ще не оцінений. Будьте першим, хто залишить відгук.",
    recentReviews: "Останні відгуки",
    noReviews: "Відгуків ще немає.",
    leaveReview: "Залишити відгук",
    toneSafe: "Безпечно (Safe)",
    toneNeutral: "Нейтрально (Neutral)",
    toneScam: "Шахрай (Scam)",
    commentPlaceholder: "Поділіться досвідом взаємодії з гаманцем",
    btnSubmit: "Надіслати відгук",
    btnSubmitting: "Надсилання...",
    errConnect: "Підключіть гаманець для відгука.",
    errTarget: "Спочатку введіть адресу цілі.",
    errComment: "Напишіть коментар.",
    statusInit: "Введіть адресу гаманця для аналізу.",
    riskNotRated: "Немає оцінки",
    riskSafe: "Безпечно",
    riskMedium: "Середній ризик",
    riskHigh: "Високий ризик"
  }
};

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={"rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur " + className}>
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const [lang, setLang] = useState<"en" | "uk">("uk");
  const t = DICT[lang];

  const getRiskMeta = (score: number | null) => {
    if (score === null) return { label: t.riskNotRated, badgeClass: "bg-slate-500/15 text-slate-300 border-slate-400/30", scoreClass: "text-slate-300", progressClass: "bg-slate-500", scoreValue: "—", progressValue: 0 };
    if (score >= 70) return { label: t.riskSafe, badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30", scoreClass: "text-emerald-300", progressClass: "bg-emerald-400", scoreValue: \`\${score}\`, progressValue: score };
    if (score >= 40) return { label: t.riskMedium, badgeClass: "bg-amber-500/15 text-amber-300 border-amber-400/30", scoreClass: "text-amber-300", progressClass: "bg-amber-400", scoreValue: \`\${score}\`, progressValue: score };
    return { label: t.riskHigh, badgeClass: "bg-rose-500/15 text-rose-300 border-rose-400/30", scoreClass: "text-rose-300", progressClass: "bg-rose-400", scoreValue: \`\${score}\`, progressValue: score };
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
  const [reviews, setReviews] = useState([]);
  const [status, setStatus] = useState(t.statusInit);
  const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setInfo = (msg: string) => { setStatusType("info"); setStatus(msg); };
  const setSuccess = (msg: string) => { setStatusType("success"); setStatus(msg); };
  const setError = (msg: string) => { setStatusType("error"); setStatus(msg); };

  const parseError = (error: unknown) => {
    const text = \`\${error ?? ""}\`;
    if (text.includes("rejected")) return "Transaction rejected.";
    if (text.includes("CooldownNotPassed")) return "Please wait before sending another review.";
    if (text.includes("already exists")) return "You already reviewed this wallet.";
    return "Failed to submit review. Refresh and try again.";
  };

  const loadTarget = async () => {
    if (!provider) { setError("Connect wallet."); return; }
    setIsChecking(true); setInfo(t.btnChecking);
    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const targetPda = getUserPda(targetPubkey);
      const user = await program.account.userAccount.fetchNullable(targetPda);
      const reviewAccounts = await program.account.reviewAccount.all([{ memcmp: { offset: 8 + 32, bytes: targetPubkey.toBase58() } }]);

      if (user) {
        setTargetUser({ wallet: user.wallet.toBase58(), score: user.score, reviewCount: Number(user.reviewCount), lowRatingCount: Number(user.lowRatingCount), flagged: user.flagged, profileExists: true });
      } else {
        setTargetUser({ wallet: targetPubkey.toBase58(), score: null, reviewCount: 0, lowRatingCount: 0, flagged: false, profileExists: false });
      }
      setReviews(reviewAccounts.map((r: any) => ({ reviewer: r.account.reviewer.toBase58(), rating: r.account.rating, comment: r.account.comment, timestamp: Number(r.account.timestamp) })).sort((a: ReviewView, b: ReviewView) => b.timestamp - a.timestamp));
      setSuccess(user ? "Reputation loaded." : "Address is valid. No on-chain reputation yet.");
    } catch {
      setError("Invalid Solana wallet address."); setTargetUser(null); setReviews([]);
    } finally { setIsChecking(false); }
  };

  const submitReview = async () => {
    if (!provider || !wallet.publicKey) { setError(t.errConnect); return; }
    if (!target.trim()) { setError(t.errTarget); return; }
    if (!comment.trim()) { setError(t.errComment); return; }
    setIsSubmitting(true); setInfo(t.btnSubmitting +" Confirm in wallet.");

    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const reviewerUser = getUserPda(wallet.publicKey);
      const targetUserPda = getUserPda(targetPubkey);
      const review = getReviewPda(targetPubkey, wallet.publicKey);
      const sponsor = getSponsorKeypair();
      const tx = new Transaction();

      tx.feePayer = sponsor.publicKey;

      const existingReviewer = await program.account.userAccount.fetchNullable(reviewerUser);
      if (!existingReviewer) {
        tx.add(await program.methods.createUser().accounts({ authority: wallet.publicKey, payer: sponsor.publicKey, user: reviewerUser, systemProgram: SystemProgram.programId }).instruction());
      }
      tx.add(await program.methods.addReview(toneToRating[reviewTone], comment).accounts({ reviewer: wallet.publicKey, payer: sponsor.publicKey, reviewerUser, target: targetPubkey, targetUser: targetUserPda, review, systemProgram: SystemProgram.programId }).instruction());

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.partialSign(sponsor);
      
      const signedTx = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signedTx.serialize(), { skipPreflight: false });
      await connection.confirmTransaction(sig, "confirmed");

      setComment(""); setReviewTone("safe"); setSuccess("Review submitted. Tx: " + sig);
      await loadTarget();
    } catch (error) {
      console.error(error);
      setError(parseError(error));
    } finally { setIsSubmitting(false); }
  };

  const riskMeta = targetUser ? getRiskMeta(targetUser.score) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Header Pipeline */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight text-white">{t.brand}</h1>
            <span className="hidden md:inline-flex items-center rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">{t.tagline}</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === "en" ? "uk" : "en")} 
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium hover:bg-white/10 transition">
              {lang === "en" ? "🇺🇦 UK" : "🇬🇧 EN"}
            </button>
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-500 !h-9 !text-xs !px-4 !rounded-lg" />
          </div>
        </div>
      </header>

      {/* Main Grid Architecture */}
      <main className="max-w-7xl mx-auto p-6 md:py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        
        {/* Left Column: Context & Results */}
        <div className="space-y-6">
          
          <div>
            <h2 className="text-3xl font-semibold text-white">{t.checkRep}</h2>
            <p className="mt-2 text-slate-400">{t.subtitle}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              placeholder={t.placeholder}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <button
              className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={loadTarget}
              disabled={isChecking || !target.trim()}
            >
              {isChecking ? t.btnChecking : t.btnCheck}
            </button>
          </div>

          {status && (
            <div className={\`rounded-xl border px-4 py-3 text-sm \${
              statusType === "success" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" :
              statusType === "error" ? "border-rose-500/20 bg-rose-500/10 text-rose-400" :
              "border-white/10 bg-white/5 text-slate-300"
            }\`}>
              {status}
            </div>
          )}

          {targetUser && riskMeta && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
              <Card title={t.resultTitle} className="border-indigo-500/20 bg-indigo-950/20">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{t.trustScore}</p>
                    <p className={\`mt-1 text-5xl font-bold \${riskMeta.scoreClass}\`}>{riskMeta.scoreValue}</p>
                  </div>
                  <span className={\`rounded-full border px-4 py-1.5 text-sm font-semibold \${riskMeta.badgeClass}\`}>
                    {riskMeta.label}
                  </span>
                </div>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className={\`h-full \${riskMeta.progressClass}\`} style={{ width: \`\${riskMeta.progressValue}%\` }} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-900 p-4">
                  <div>
                    <p className="text-sm text-slate-500">{t.wallet}</p>
                    <p className="mt-1 font-mono text-sm text-slate-200">{shortAddress(targetUser.wallet)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t.reviews}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-200">{targetUser.reviewCount}</p>
                  </div>
                </div>
                {!targetUser.profileExists && <p className="mt-4 text-xs text-amber-500/80">{t.notRatedPrompt}</p>}
              </Card>

              <Card title={t.recentReviews}>
                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-slate-500">{t.noReviews}</p>
                  ) : (
                    reviews.slice(0, 5).map((r, i) => (
                      <div key={i} className="rounded-xl bg-slate-900 p-4">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-200">{r.rating}/5</span>
                          <span className="text-xs text-slate-500">{new Date(r.timestamp * 1000).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{r.comment}</p>
                        <p className="mt-3 text-xs font-mono text-slate-500">{shortAddress(r.reviewer)}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Right Column: Interaction */}
        <div className="sticky top-[86px]">
          <Card title={t.leaveReview} className="border-slate-800">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Rating Tone</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none focus:border-indigo-500"
                  value={reviewTone}
                  onChange={(e) => setReviewTone(e.target.value as ReviewTone)}
                >
                  <option value="safe">{t.toneSafe}</option>
                  <option value="neutral">{t.toneNeutral}</option>
                  <option value="scam">{t.toneScam}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 block">Comment</label>
                <textarea
                  className="min-h-[140px] w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-indigo-500 resize-none"
                  placeholder={t.commentPlaceholder}
                  value={comment}
                  maxLength={280}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <button
                className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={submitReview}
                disabled={isSubmitting || !wallet.connected || !target.trim() || !comment.trim()}
              >
                {isSubmitting ? t.btnSubmitting : t.btnSubmit}
              </button>
              
              {(!wallet.connected || !target.trim() || !comment.trim()) && (
                <p className="text-xs text-slate-500 text-center">
                  {!wallet.connected ? t.errConnect : !target.trim() ? t.errTarget : t.errComment}
                </p>
              )}
            </div>
          </Card>
        </div>

      </main>
    </div>
  );
}
`;
fs.writeFileSync('src/App.tsx', code, 'utf-8');
