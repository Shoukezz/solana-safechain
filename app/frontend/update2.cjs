const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace standard state with extended one
code = code.replace(
  /const \[statusType, setStatusType\] = useState<"info" \| "success" \| "error">"info"\);/,
  \`const [statusType, setStatusType] = useState<"info" | "success" | "error">("info");
  const [chainStats, setChainStats] = useState<any>(null);\`
);

// Replace loadTarget logic
const oldLoadTarget = \`  const loadTarget = async () => {
    if (!provider) { setError("Connect wallet."); return; }
    setIsChecking(true); setInfo(t.btnChecking);
    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const targetPda = getUserPda(targetPubkey);
      const user = await program.account.userAccount.fetchNullable(targetPda);  
      const reviewAccounts = await program.account.reviewAccount.all([{ memcmp: 
{ offset: 8 + 32, bytes: targetPubkey.toBase58() } }]);                         
      if (user) {
        setTargetUser({ wallet: user.wallet.toBase58(), score: user.score, revie
wCount: Number(user.reviewCount), lowRatingCount: Number(user.lowRatingCount), flagged: user.flagged, profileExists: true });                                         } else {
        setTargetUser({ wallet: targetPubkey.toBase58(), score: null, reviewCoun
t: 0, lowRatingCount: 0, flagged: false, profileExists: false });                     }
      setReviews(reviewAccounts.map((r: any) => ({ reviewer: r.account.reviewer.
toBase58(), rating: r.account.rating, comment: r.account.comment, timestamp: Number(r.account.timestamp) })).sort((a: ReviewView, b: ReviewView) => b.timestamp - a.timestamp));                                                                      setSuccess(user ? "Reputation loaded." : "Address is valid. No on-chain re
putation yet.");                                                                    } catch {
      setError("Invalid Solana wallet address."); setTargetUser(null); setReview
s([]);                                                                              } finally { setIsChecking(false); }
  };\`;

const newLoadTarget = \`  const loadTarget = async () => {
    if (!provider) { setError("Connect wallet."); return; }
    setIsChecking(true); setInfo(t.btnChecking);
    try {
      const targetPubkey = new PublicKey(target);
      const program = getProgram(provider) as any;
      const targetPda = getUserPda(targetPubkey);
      
      const [user, reviewAccounts, balance, sigs] = await Promise.all([
        program.account.userAccount.fetchNullable(targetPda),
        program.account.reviewAccount.all([{ memcmp: { offset: 8 + 32, bytes: targetPubkey.toBase58() } }]),
        connection.getBalance(targetPubkey).catch(() => 0),
        connection.getSignaturesForAddress(targetPubkey, { limit: 100 }).catch(() => [])
      ]);
      
      const balanceSOL = balance / 1e9;
      const txCount = sigs.length;
      const blockTime = sigs[sigs.length - 1]?.blockTime;
      const ageDays = blockTime ? Math.max(0, Math.floor((Date.now() / 1000 - blockTime) / 86400)) : 0;

      let chainScore = 0;
      if (balanceSOL > 5) chainScore += 40;
      else if (balanceSOL > 0.5) chainScore += 20;
      else if (balanceSOL > 0.05) chainScore += 10;

      if (txCount > 50) chainScore += 30;
      else if (txCount > 20) chainScore += 15;
      else if (txCount > 0) chainScore += 5;

      if (ageDays > 60) chainScore += 30;
      else if (ageDays > 14) chainScore += 15;

      setChainStats({ balance: balanceSOL.toFixed(2), txs: txCount, age: ageDays, score: chainScore });

      const userProfileScore = user ? Number(user.score) : null;
      let finalScore = chainScore;
      if (userProfileScore !== null) {
          // If community thinks it's a scam (<40), hard limit the score 
          if (userProfileScore < 40) finalScore = Math.min(chainScore, userProfileScore);
          else finalScore = Math.floor((chainScore * 0.3) + (userProfileScore * 0.7));
      }

      setTargetUser({
        wallet: targetPubkey.toBase58(),
        score: finalScore,
        reviewCount: user ? Number(user.reviewCount) : 0,
        lowRatingCount: user ? Number(user.lowRatingCount) : 0,
        flagged: user ? user.flagged : false,
        profileExists: !!user
      });

      setReviews(reviewAccounts.map((r: any) => ({ reviewer: r.account.reviewer.toBase58(), rating: r.account.rating, comment: r.account.comment, timestamp: Number(r.account.timestamp) })).sort((a: ReviewView, b: ReviewView) => b.timestamp - a.timestamp));

      setSuccess(user ? "Reputation and chain data loaded." : "Address is valid. Baseline chain score computed.");
    } catch (e) {
      setError("Invalid Solana wallet address."); setTargetUser(null); setReviews([]); setChainStats(null);
    } finally { setIsChecking(false); }
  };\`;

// We use regex to replace old loadTarget to avoid spacing issues
code = code.replace(/const loadTarget = async \(\) => \{[\s\S]*?\};\n/m, newLoadTarget + '\n');


const uiOld = \`  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">\`;

const uiNew = \`  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">\`;

code = code.replace(uiOld, uiNew);


code = code.replace(
  /<Card title=\{t\.recentReviews\}>/,
  \`{chainStats && (
              <Card title={t.onChainMetrics} className="border-indigo-500/10">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-1 rounded-xl bg-slate-900/50 p-4 border border-white/5">
                    <p className="text-xs text-slate-500">{t.chainScore}</p>
                    <p className="mt-1 text-2xl font-bold text-indigo-400">{chainStats.score}</p>
                  </div>
                  <div className="col-span-3 grid grid-cols-3 gap-4 rounded-xl bg-slate-900/50 p-4 border border-white/5">
                    <div>
                      <p className="text-xs text-slate-500">{t.balance}</p>
                      <p className="mt-1 font-mono text-sm text-slate-200">{chainStats.balance} SOL</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.txCount}</p>
                      <p className="mt-1 font-mono text-sm text-slate-200">{chainStats.txs} {t.txsSuffix}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.walletAge}</p>
                      <p className="mt-1 font-mono text-sm text-slate-200">{chainStats.age} {t.days}</p>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {t.hybridNote}
                </p>
              </Card>
            )}
            
            <Card title={t.recentReviews}>\`
);

fs.writeFileSync('src/App.tsx', code, 'utf-8');
console.log('App.tsx updated');