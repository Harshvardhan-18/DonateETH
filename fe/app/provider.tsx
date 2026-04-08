"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiConfig, createConfig, http } from "wagmi";
import { base, mainnet, optimism, sepolia } from "wagmi/chains";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { useState } from "react";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "42f27e35eec1497a072b6d5a21009bfa";

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [config] = useState(() =>
    createConfig({
      ssr: true,
      chains: [mainnet, base, sepolia, optimism],
      connectors:
        typeof window === "undefined"
          ? []
          : [injected(), walletConnect({ projectId }), metaMask(), safe()],
      transports: {
        [mainnet.id]: http(),
        [base.id]: http(),
        [sepolia.id]: http(),
        [optimism.id]: http(),
      },
    })
  );

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiConfig>
  );
}
