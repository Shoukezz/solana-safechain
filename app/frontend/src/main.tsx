import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { 
  PhantomWalletAdapter, 
  SolflareWalletAdapter,
  LedgerWalletAdapter,
  TrustWalletAdapter
} from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import App from "./App";
import { RPC_URL } from "./anchorClient";
import "./styles.css";

(window as Window & { Buffer: typeof Buffer }).Buffer = Buffer;

const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(), // Поддерживает MetaMask через MetaMask Snaps
  new TrustWalletAdapter(),
  new LedgerWalletAdapter()
];

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
