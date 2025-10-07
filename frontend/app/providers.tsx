"use client";

import * as React from "react";

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
   base, baseSepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const projectId = process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID || '';

// Combine wagmi chains with custom configurations
const chainList = [
   base, baseSepolia,
];

const selectedChain = chainList.find(chain => chain.id === Number(process.env.NEXT_PUBLIC_MULTIBAAS_CHAIN_ID)) || baseSepolia;

const config = getDefaultConfig({
  appName: 'Base Marketplace',
  projectId,
  chains: [selectedChain],
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <>{children}</>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
