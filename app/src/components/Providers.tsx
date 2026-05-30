"use client";

import { Buffer } from "buffer";
import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { Toaster } from "react-hot-toast";
import { RPC_URL } from "@/lib/constants";

// web3.js / anchor expect a global Buffer in the browser.
if (typeof window !== "undefined") {
  (window as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;
}

export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* Phantom, Solflare, Backpack, etc. auto-register via the Wallet Standard. */}
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#151712",
                color: "#f3eede",
                border: "1px solid rgba(243,238,222,0.12)",
                borderRadius: "12px",
                fontFamily: "var(--font-plex-mono), monospace",
                fontSize: "13px",
              },
            }}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
