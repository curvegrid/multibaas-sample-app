"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import useMultiBaas, { type Order } from "../hooks/useMultiBaas";

/**
 * OrderHistory Component
 *
 * Displays user's purchase history from the marketplace.
 *
 * EDUCATIONAL: This demonstrates:
 * - Fetching user-specific data from smart contract
 * - Formatting BigInt values for display
 * - Converting timestamps to human-readable dates
 * - Currency-aware formatting (USDC vs JPYC)
 * - Empty state handling
 *
 * KEY FEATURES:
 * - Shows all user purchases in reverse chronological order
 * - Displays product name, quantity, price, currency
 * - Links to Base Sepolia block explorer
 * - Auto-refreshes when wallet changes
 *
 * WORKSHOP NOTE: Compare getUserOrders() to view functions in voting app.
 * Same pattern: no gas, instant results, anyone can call.
 */

const OrderHistory: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { getUserOrders, getCurrency } = useMultiBaas();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currencyDecimals, setCurrencyDecimals] = useState<Map<string, number>>(new Map());

  /**
   * Fetch user's order history
   */
  const fetchOrders = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      const userOrders = await getUserOrders(address);

      if (userOrders) {
        // Sort by timestamp descending (most recent first)
        const sortedOrders = [...userOrders].sort((a, b) =>
          Number(b.timestamp) - Number(a.timestamp)
        );
        setOrders(sortedOrders);
      } else {
        setError("Failed to load orders");
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [address, getUserOrders]);

  // Fetch orders when wallet connects or address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchOrders();
    } else {
      setOrders([]);
    }
  }, [isConnected, address, fetchOrders]);

  // Fetch currency decimals for all currencies in orders
  useEffect(() => {
    const fetchCurrencyDecimals = async () => {
      const uniqueCurrencies = Array.from(new Set(orders.map((o) => o.currencySymbol)));
      const decimalsMap = new Map<string, number>();

      for (const symbol of uniqueCurrencies) {
        const currency = await getCurrency(symbol);
        if (currency) {
          decimalsMap.set(symbol, currency.decimals);
        }
      }

      setCurrencyDecimals(decimalsMap);
    };

    if (orders.length > 0) {
      fetchCurrencyDecimals();
    }
  }, [orders, getCurrency]);

  /**
   * Format timestamp to readable date
   */
  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /**
   * Format price based on currency (using on-chain decimals)
   */
  const formatPrice = (price: bigint, currencySymbol: string): string => {
    const decimals = currencyDecimals.get(currencySymbol) ?? 18; // Default to 18 while loading
    return formatUnits(price, decimals);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-[#FFF4E5] border border-[#FFE0B2] rounded-lg p-4 text-center">
        <h3 className="text-lg m-0 mb-2">📋 Order History</h3>
        <p className="text-sm m-0">Connect your wallet to view your purchase history</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 text-center">
        <div className="spinner mb-4"></div>
        <p className="text-sm m-0">Loading your orders...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-[#FFEBEE] border border-[#FFCDD2] rounded-lg p-4 text-center">
        <p className="text-[#C62828] text-sm m-0 mb-3">❌ {error}</p>
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-[#0052FF] text-white border-none rounded-md cursor-pointer text-sm min-h-[40px]"
        >
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  if (orders.length === 0) {
    return (
      <div className="bg-white border border-[#E0E0E0] rounded-lg p-4 text-center">
        <h3 className="text-lg m-0 mb-2">📋 Order History</h3>
        <p className="text-[#666] text-sm m-0 mb-2">You have not made any purchases yet</p>
        <p className="text-xs text-[#888] m-0">
          Your purchase history will appear here
        </p>
      </div>
    );
  }

  // Orders list
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-xl p-4">
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h2 className="m-0 text-xl">📋 Order History</h2>
        <button
          onClick={fetchOrders}
          className="px-3 py-2 bg-[#F5F5F5] text-[#333] border border-[#E0E0E0] rounded-md cursor-pointer text-xs min-h-[36px]"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="text-xs text-[#666] mb-3">
        Total orders: {orders.length}
      </div>

      {/* Orders table - scrollable on mobile */}
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className="w-full border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#F5F5F5] border-b-2 border-[#E0E0E0]">
              <th className="p-2 text-left font-semibold text-xs">Order ID</th>
              <th className="p-2 text-left font-semibold text-xs">Product ID</th>
              <th className="p-2 text-right font-semibold text-xs">Qty</th>
              <th className="p-2 text-right font-semibold text-xs">Total</th>
              <th className="p-2 text-left font-semibold text-xs">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
                <tr
                  key={order.id.toString()}
                  className="border-b border-[#E0E0E0]"
                >
                  <td className="p-2">
                    <code className="text-xs">#{order.id.toString()}</code>
                  </td>
                  <td className="p-2">
                    <code className="text-xs">#{order.productId.toString()}</code>
                  </td>
                  <td className="p-2 text-right text-sm">
                    {order.quantity.toString()}
                  </td>
                  <td className="p-2 text-right">
                    <div>
                      <span className="font-semibold text-sm">
                        {formatPrice(order.totalPrice, order.currencySymbol)}
                      </span>
                      <span className={`ml-1 font-semibold text-xs ${
                        order.currencySymbol === "USDC" ? "text-[#2775CA]" : "text-[#00D395]"
                      }`}>
                        {order.currencySymbol}
                      </span>
                    </div>
                  </td>
                  <td className="p-2 text-xs text-[#666]">
                    {formatDate(order.timestamp)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Base Sepolia explorer link */}
      <div className="mt-4 p-3 bg-[#F5F5F5] rounded-lg">
        <div className="text-xs text-[#666]">
          💡 View on{" "}
          <a
            href={`https://sepolia.basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0052FF] no-underline hover:underline"
          >
            Base Sepolia Explorer
          </a>
        </div>
      </div>
    </div>
  );
};

export default OrderHistory;
