const fs = require('fs');

const dictCode = `
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
    errConnect: "Connect wallet to submit.",
    errTarget: "Enter target address first.",
    errComment: "Write a comment to enable submit.",
    statusInit: "Enter a wallet address to begin.",
    riskNotRated: "Not Rated Yet",
    riskSafe: "Safe",
    riskMedium: "Medium",
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
    notRatedPrompt: "У цього гаманця немає відгуків. Показано тільки базову активність.",
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
`;

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace DICT
content = content.replace(/const DICT = \{[\s\S]*?\n\};\n/m, dictCode);

fs.writeFileSync('src/App.tsx', content, 'utf-8');

console.log("DICT updated");
