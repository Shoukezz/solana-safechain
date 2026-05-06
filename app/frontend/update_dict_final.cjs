const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const newDict = `const DICT = {
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
};`;

const startIndex = content.indexOf('const DICT = {');
const endIndex = content.indexOf('function Card({', startIndex);
if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newDict + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Translations updated successfully.');
} else {
  console.log('Could not find dictionary bounds');
}
