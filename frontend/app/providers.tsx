"use client";

import * as React from "react";

import {
  getDefaultConfig,
  RainbowKitProvider,
  Chain
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
   arbitrum, arbitrumSepolia,
   avalanche, avalancheFuji,
   base, baseSepolia,
   bsc, bscTestnet,
   celo, celoAlfajores,
   mainnet, sepolia, holesky,
   flare, flareTestnet,
   gnosis,
   lisk, liskSepolia,
   mantle, mantleTestnet,
   neonMainnet, neonDevnet,
   optimism, optimismSepolia,
   polygon, polygonAmoy,
   scroll, scrollSepolia,
   zircuit, zircuitTestnet
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const projectId = process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID || '';
const mbBaseUrl = process.env.NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL || '';
const mbWeb3ApiKey = process.env.NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY || '';

// Add chains not supported by wagmi/chains

const xrplEvmMainnet = {
  id: 1440000,
  name: 'XRPL EVM Mainnet',
  nativeCurrency: { name: 'Ripple', symbol: 'XRPL', decimals: 18 },
  rpcUrls: {
    default: { http: [`https://rpc.xrplevm.org`] },
  },
} as const satisfies Chain;

const xrplEvmTestnet = {
  id: 1449000,
  name: 'XRPL EVM Testnet',
  nativeCurrency: { name: 'Ripple', symbol: 'XRPL', decimals: 18 },
  rpcUrls: {
    default: { http: [`https://rpc.testnet.xrplevm.org`] },
  },
} as const satisfies Chain;


const curvegridTestnet = {
  id: 2017072401,
  name: 'Curvegrid Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [`${mbBaseUrl}/web3/${mbWeb3ApiKey}`] },
  },
} as const satisfies Chain;

// Combine wagmi chains with custom configurations
const chainList = [
   arbitrum, arbitrumSepolia,
   avalanche, avalancheFuji,
   base, baseSepolia,
   bsc, bscTestnet,
   celo, celoAlfajores,
   curvegridTestnet,        // Manual addition
   flare, flareTestnet,
   gnosis,
   lisk, liskSepolia,
   mainnet, sepolia, holesky,
   mantle, mantleTestnet,
   neonMainnet, neonDevnet,
   optimism, optimismSepolia,
   polygon, polygonAmoy,
   scroll, scrollSepolia,
   xrplEvmMainnet, xrplEvmTestnet, // Manual addition
   zircuit, zircuitTestnet
];

const selectedChain = chainList.find(chain => chain.id === Number(process.env.NEXT_PUBLIC_MULTIBAAS_CHAIN_ID)) || curvegridTestnet;

const config = getDefaultConfig({
  appName: 'Simple Voting DApp',
  projectId,
  chains: [selectedChain],
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {mounted && children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
