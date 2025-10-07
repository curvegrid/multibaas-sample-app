"use client";

import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import ProductList from "./components/ProductList";
import TokenBalance from "./components/TokenBalance";
import AdminPanel from "./components/AdminPanel";
import OrderHistory from "./components/OrderHistory";
import useMultiBaas from "./hooks/useMultiBaas";

/**
 * ECOMMERCE MARKETPLACE - HOMEPAGE
 *
 * This page displays the product marketplace where users can:
 * - Browse available products (via ProductList component)
 * - Purchase with USDC or JPYC (via PurchaseModal)
 * - See multi-step transaction flow (approve + purchase)
 * - View token balances (via TokenBalance component)
 *
 * EDUCATIONAL: Compare to archived Voting.tsx
 * Similarities:
 * - useMultiBaas hook for contract interactions
 * - MultiBaas SDK pattern (no direct ethers/viem)
 * - Wallet connection via RainbowKit
 * - Transaction monitoring with wagmi
 *
 * KEY DIFFERENCES FROM VOTING APP:
 * - Multi-contract interactions (Marketplace + USDC/JPYC tokens)
 * - Two-step transactions (approve then purchase)
 * - Token allowance checking
 * - Multiple currencies support
 * - More complex state management
 *
 * MULTIBAAS PATTERN:
 * 1. Read products: getProducts() - view function, no gas
 * 2. Purchase flow:
 *    a. Check token allowance: getUSDCAllowance() or getJPYCAllowance()
 *    b. If insufficient: approveUSDC() or approveJPYC()
 *    c. Wait for approval confirmation
 *    d. Call purchaseProduct() with approved tokens
 *    e. Wait for purchase confirmation
 * 3. All MultiBaas calls return unsigned transactions for wallet signing
 */

const Home: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { isAdmin } = useMultiBaas();

  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "admin">("shop");
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  // Check if connected user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (isConnected && address) {
        const adminStatus = await isAdmin(address);
        setUserIsAdmin(adminStatus || false);
      } else {
        setUserIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [isConnected, address, isAdmin]);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Navbar */}
      <nav className="bg-white border-b border-[#E0E0E0] sticky top-0 z-50 px-4 py-3 md:px-8 md:py-4 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center max-w-[1200px] mx-auto gap-4 md:gap-8">
          <h1 className="text-xl md:text-2xl font-bold m-0 whitespace-nowrap">
            🛒 Base Shop
          </h1>
          <div className="flex gap-4 items-center shrink-0">
            <TokenBalance />
            <ConnectButton />
          </div>
        </div>
      </nav>

      {/* Tab Navigation */}
      <div className="px-4 md:px-8 mt-2 md:mt-4">
        <div className="flex gap-2 md:gap-4 border-b-2 border-[#E0E0E0] mb-4 md:mb-8 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <button
            onClick={() => setActiveTab("shop")}
            className={`px-4 py-3 md:px-6 md:py-4 bg-transparent border-none font-semibold text-sm md:text-base cursor-pointer transition-all whitespace-nowrap border-b-[3px] ${
              activeTab === "shop" ? "border-[#0052FF] text-[#0052FF]" : "border-transparent text-[#666]"
            }`}
          >
            🛍️ Shop
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-3 md:px-6 md:py-4 bg-transparent border-none font-semibold text-sm md:text-base cursor-pointer transition-all whitespace-nowrap border-b-[3px] ${
              activeTab === "orders" ? "border-[#0052FF] text-[#0052FF]" : "border-transparent text-[#666]"
            }`}
          >
            📋 Orders
          </button>
          {userIsAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-3 md:px-6 md:py-4 bg-transparent border-none font-semibold text-sm md:text-base cursor-pointer transition-all whitespace-nowrap border-b-[3px] ${
                activeTab === "admin" ? "border-[#0052FF] text-[#0052FF]" : "border-transparent text-[#666]"
              }`}
            >
              🔐 Admin
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-8">
        {activeTab === "shop" && <ProductList />}
        {activeTab === "orders" && (
          <div className="px-4">
            <OrderHistory />
          </div>
        )}
        {activeTab === "admin" && userIsAdmin && (
          <div className="px-4">
            <AdminPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
