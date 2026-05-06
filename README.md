# 🛡️ SafeChain | Web3 Reputation Layer

<p align="center">
  <img src="app/frontend/public/logo.png" alt="SafeChain Logo" width="120" height="120" />
</p>

<p align="center">
  <strong>Instant on-chain trust check for any wallet address on Solana.</strong><br>
  Built for the <strong>Solana Colosseum Hackathon</strong>.
</p>

---

## 📖 Overview

Scams and malicious actors drain millions from the crypto ecosystem every month. In Web3, you often don't know who you are interacting with until it's too late. 

**SafeChain** is a fully decentralized **Web3 Reputation Layer**. It maps community trust directly to Solana addresses, generating a dynamic **Trust Score (0-100)** based on on-chain algorithmic aggregation of user reviews and base chain activity.

Before you sign a transaction, send funds, or accept an NFT offer, just paste the target wallet into SafeChain and let the community warn you if it's a scam.

## ✨ Key Features & Innovations

- **100% Gasless UX:** Users don't pay network fees to leave reviews! Our backend acts as a Relayer/Sponsor, covering the transaction fees. This enables Web2-like friction for a Web3 security tool.
- **On-Chain Math:** Trust scores aren't arbitrary. We use on-chain exponential smoothing and algorithm limits written natively in our Anchor Rust program. 
- **Sybil Resistance & Cooldowns:** Built-in smart contract logic enforces cooldowns and strictly allows 1 review per wallet pair to absolutely eliminate spam and manipulating scores.
- **Phantom Optimized:** We intentionally excluded auto-detected clunky wallets, optimizing the entire app precisely for the **Phantom Wallet** to provide seamless connection and signing.
- **Cyberpunk UI & i18n:** Lightning-fast React + Vite frontend styled with Tailwind CSS, utilizing a slick pitch-black/neon-cyan design, available out-of-the-box in English & Ukrainian.

## 🏗️ Architecture

- **Smart Contract (Programs):** Solana program written in 'Rust' utilizing the 'Anchor' framework (programs/safechain).
- **Frontend App:** 'React.js' + 'Vite', styled with 'Tailwind CSS'. Deploys seamlessly to Vercel.
- **Backend Relayer:** 'Node.js' + 'Express'. Listens for partial transactions, signs as the fee payer, and dispatches them to the Solana RPC. 

## 🚀 Getting Started (Local Development)

Want to run SafeChain locally? You'll need Node.js and npm installed.

### 1. Clone the repository
`ash
git clone https://github.com/vladnewt1/safe-chain-test.git
cd safe-chain-test
`

### 2. Start the Backend Relayer (Port 8080)
This acts as the sponsor wallet (gasless fee payer).
`ash
cd backend
npm install
npm run dev
`

### 3. Start the Frontend (Port 5173)
Open a new terminal tab and run:
`ash
cd app/frontend
npm install
npm run dev
`

### 4. Try it out
Open your browser at http://localhost:5173, connect your Phantom wallet, and try analyzing or reviewing a wallet address!

## 📜 Smart Contract Overview

* **Trust Score Formula**: Combines neutral chain activity with community consensus. Ratings (Safe=5, Neutral=3, Scam=1) are merged using exponential moving average logic.
* **Storage**: We use PDAs (Program Derived Addresses) seeded by ["user", user_pubkey] to store aggregate profile stats, and ["review", target_pubkey, reviewer_pubkey] to store individual comments.

## 🔗 Hackathon Links

- **Live Demo (Vercel):** [https://safe-chain-test.vercel.app/](https://safe-chain-test.vercel.app/)
- **Demo Video:** [Add YouTube/Loom Link Here]
- **Presentation Deck:** [Add Link Here]

---
*Built with ❤️ for the Solana Colosseum Hackathon.*
