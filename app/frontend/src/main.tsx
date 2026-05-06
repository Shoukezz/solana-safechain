import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import { ConnectionProvider, WalletProvider, WalletContext, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import App from "./App";
import { RPC_URL } from "./anchorClient";
import "./styles.css";

(window as Window & { Buffer: typeof Buffer }).Buffer = Buffer;

const wallets = [
  new PhantomWalletAdapter()
];

function FilteredWalletProvider({ children }: { children: React.ReactNode }) {
  const context = useWallet();
  const filteredContext = React.useMemo(() => {
    return {
      ...context,
      wallets: context.wallets.filter((w) => w.adapter.name === "Phantom")
    };
  }, [context]);

  return (
    <WalletContext.Provider value={filteredContext}>
      {children}
    </WalletContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <FilteredWalletProvider>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </FilteredWalletProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);
