"use client";
import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import useMultiBaas from "../hooks/useMultiBaas";

/**
 * TokenBalance Component
 *
 * Displays user's USDC and JPYC token balances in the navbar.
 *
 * EDUCATIONAL: Demonstrates view-only contract calls
 * - No wallet signature needed
 * - No gas cost
 * - Polls for updates when wallet is connected
 *
 * MultiBaas Pattern:
 * - getUSDCBalance() returns balance as string (raw wei amount)
 * - formatUnits() converts to human-readable (accounting for decimals)
 * - USDC: 6 decimals (1 USDC = 1000000 units)
 * - JPYC: 6 decimals (1 JPYC = 1000000 units) - Uses FiatTokenV2 standard
 */

const TokenBalance: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { getUSDCBalance, getJPYCBalance } = useMultiBaas();

  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [jpycBalance, setJpycBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch balances when wallet connects or address changes
   */
  useEffect(() => {
    if (!isConnected || !address) {
      setUsdcBalance(null);
      setJpycBalance(null);
      return;
    }

    const fetchBalances = async () => {
      setLoading(true);
      try {
        const [usdc, jpyc] = await Promise.all([
          getUSDCBalance(address),
          getJPYCBalance(address),
        ]);

        setUsdcBalance(usdc);
        setJpycBalance(jpyc);
      } catch (err) {
        console.error("Error fetching balances:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();

    // Poll for balance updates every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [address, isConnected, getUSDCBalance, getJPYCBalance]);

  if (!isConnected || !address) {
    return null;
  }

  if (loading && usdcBalance === null && jpycBalance === null) {
    return (
      <div className="flex gap-4 items-center">
        <div className="text-sm text-gray-500">Loading balances...</div>
      </div>
    );
  }

  // Format balances with proper decimals
  const formattedUsdc = usdcBalance ? formatUnits(BigInt(usdcBalance), 6) : "0.00";
  const formattedJpyc = jpycBalance ? formatUnits(BigInt(jpycBalance), 6) : "0.00";

  return (
    <div className="token-balance hidden md:flex gap-4 items-center px-4 py-2 bg-[#f5f5f5] rounded-lg text-sm">
      {/* USDC Balance */}
      <div className="flex items-center gap-1">
        <span className="font-semibold text-[#2775CA]">USDC:</span>
        <span>{parseFloat(formattedUsdc).toFixed(2)}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[#ddd]"></div>

      {/* JPYC Balance */}
      <div className="flex items-center gap-1">
        <span className="font-semibold text-[#00D395]">JPYC:</span>
        <span>{parseFloat(formattedJpyc).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default TokenBalance;
