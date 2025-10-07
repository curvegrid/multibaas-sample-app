"use client";
import React, { useState, useEffect } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import useMultiBaas, { type Product } from "../hooks/useMultiBaas";

/**
 * PurchaseModal Component
 *
 * Handles the complete purchase flow:
 * 1. Check token allowance
 * 2. If insufficient: Request approval
 * 3. Wait for approval confirmation
 * 4. Execute purchase
 * 5. Wait for purchase confirmation
 *
 * EDUCATIONAL: This demonstrates the ERC20 approve + transferFrom pattern.
 * This is THE KEY DIFFERENCE from the voting app (which had no external dependencies).
 *
 * MULTI-STEP TRANSACTION FLOW:
 * Step 1: User approves marketplace to spend their tokens
 * Step 2: Marketplace calls transferFrom to collect payment
 *
 * WHY TWO STEPS?
 * - Security: User explicitly approves amount before marketplace can take it
 * - Standard pattern: All ERC20 token payments work this way
 * - Gas: Approval is separate transaction (costs gas)
 */

interface PurchaseModalProps {
  isOpen: boolean;
  product: Product;
  onClose: () => void;
  onComplete: () => void;
}

type PurchaseStep = "input" | "checking" | "approving" | "purchasing" | "success" | "error";

const PurchaseModal: React.FC<PurchaseModalProps> = ({
  isOpen,
  product,
  onClose,
  onComplete,
}) => {
  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  // MultiBaas hooks
  const {
    getUSDCAllowance,
    getJPYCAllowance,
    approveUSDC,
    approveJPYC,
    purchaseProduct,
    getCurrency,
  } = useMultiBaas();

  // State
  const [quantity, setQuantity] = useState("1");
  const [step, setStep] = useState<PurchaseStep>("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [decimals, setDecimals] = useState<number>(18); // Default while loading

  // Transaction receipt monitoring
  const { data: txReceipt, isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Contract addresses
  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "";

  // v2.0: Currency symbol is now stored directly in product
  const currencySymbol = product.currencySymbol;
  const isUSDC = currencySymbol === "USDC";

  // Calculate total price
  const totalPrice = product.price * BigInt(quantity);
  const formattedTotal = formatUnits(totalPrice, decimals);

  /**
   * Fetch currency decimals from on-chain registry
   */
  useEffect(() => {
    const fetchCurrency = async () => {
      const currency = await getCurrency(product.currencySymbol);
      if (currency) {
        setDecimals(currency.decimals);
      }
    };
    fetchCurrency();
  }, [product.currencySymbol, getCurrency]);

  /**
   * Reset modal state when opened/closed
   */
  useEffect(() => {
    if (isOpen) {
      setQuantity("1");
      setStep("input");
      setErrorMessage("");
      setTxHash(undefined);
    }
  }, [isOpen]);

  /**
   * Monitor transaction confirmation
   */
  useEffect(() => {
    if (txReceipt) {
      if (step === "approving") {
        // Approval confirmed, now purchase
        setStep("purchasing");
        setTxHash(undefined);
        handlePurchase();
      } else if (step === "purchasing") {
        // Purchase confirmed, success!
        setStep("success");
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    }
  }, [txReceipt, step]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Check allowance and start purchase flow
   */
  const handleStartPurchase = async () => {
    if (!address) return;

    try {
      setStep("checking");
      setErrorMessage("");

      // Check current allowance
      const getAllowance = isUSDC ? getUSDCAllowance : getJPYCAllowance;
      const allowanceStr = await getAllowance(address, marketplaceAddress);

      if (!allowanceStr) {
        throw new Error("Failed to check token allowance");
      }

      const allowance = BigInt(allowanceStr);

      // If allowance is sufficient, skip approval
      if (allowance >= totalPrice) {
        setStep("purchasing");
        await handlePurchase();
      } else {
        // Need approval first
        setStep("approving");
        await handleApprove();
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Transaction failed");
      setStep("error");
    }
  };

  /**
   * Approve token spending
   *
   * INDUSTRY STANDARD: Unlimited approval (type(uint256).max)
   * This matches the UX of major DeFi protocols (Aave, Uniswap, Compound).
   *
   * EDUCATIONAL - Security Tradeoff:
   * - ✅ Best UX: User only approves once, ever
   * - ⚠️  Security consideration: If marketplace contract is compromised,
   *      attacker could drain all approved tokens
   * - 🏭 Production reality: All major DeFi apps use unlimited approval
   * - 💡 Alternative: Some wallets (like Rabby) let users set custom limits
   *
   * WORKSHOP NOTE: This is the ERC20 approve + transferFrom pattern.
   * The marketplace can't take tokens without user calling purchaseProduct().
   */
  const handleApprove = async () => {
    try {
      const approve = isUSDC ? approveUSDC : approveJPYC;

      // Unlimited approval (industry standard)
      // Using max uint256: 2^256 - 1
      const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
      const approvalAmount = MAX_UINT256;

      const approveTx = await approve(marketplaceAddress, approvalAmount);

      const hash = await sendTransactionAsync(approveTx);
      setTxHash(hash);
    } catch (err) {
      console.error("Approval error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Approval failed");
      setStep("error");
    }
  };

  /**
   * Execute purchase (after approval if needed)
   */
  const handlePurchase = async () => {
    try {
      const purchaseTx = await purchaseProduct(
        product.id.toString(),
        quantity
      );

      const hash = await sendTransactionAsync(purchaseTx);
      setTxHash(hash);
    } catch (err) {
      console.error("Purchase error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Purchase failed");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal overlay */}
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4"
        onClick={step === "input" || step === "error" ? onClose : undefined}
      >
        {/* Modal content */}
        <div
          className="bg-white rounded-xl p-6 max-w-[500px] w-full max-h-[90vh] overflow-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-4">
            <h2 className="m-0 mb-2 text-xl">Purchase {product.name}</h2>
            <p className="m-0 text-[#666] text-sm">
              {formatUnits(product.price, decimals)} {currencySymbol} each
            </p>
          </div>

          {/* Input Step */}
          {step === "input" && (
            <>
              <div className="mb-4">
                <label className="block mb-2 font-semibold text-sm">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full p-3 border border-[#e0e0e0] rounded-md text-base"
                />
              </div>

              <div className="p-3 bg-[#f5f5f5] rounded-lg mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-semibold text-sm">
                    {formattedTotal} {currencySymbol}
                  </span>
                </div>
                <div className="text-xs text-[#666]">
                  Payment with {currencySymbol}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 p-3 bg-white text-[#333] border border-[#e0e0e0] rounded-md text-sm font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartPurchase}
                  disabled={!quantity || parseInt(quantity) < 1}
                  className="flex-1 p-3 bg-[#0052FF] text-white border-none rounded-md text-sm font-semibold cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buy Now
                </button>
              </div>
            </>
          )}

          {/* Checking Step */}
          {step === "checking" && (
            <div className="text-center py-6">
              <div className="spinner mb-4"></div>
              <p className="text-sm m-0">Checking token allowance...</p>
            </div>
          )}

          {/* Approving Step */}
          {step === "approving" && (
            <div className="text-center py-6">
              <div className="spinner mb-4"></div>
              <h3 className="text-lg m-0 mb-3">Step 1 of 2: Approve {currencySymbol}</h3>
              <p className="text-[#666] text-sm m-0">
                {isTxPending
                  ? "Waiting for approval confirmation..."
                  : "Please approve the transaction in your wallet"}
              </p>
              <div className="text-xs text-[#888] mt-3">
                💡 This allows the marketplace to spend your {currencySymbol}
              </div>
            </div>
          )}

          {/* Purchasing Step */}
          {step === "purchasing" && (
            <div className="text-center py-6">
              <div className="spinner mb-4"></div>
              <h3 className="text-lg m-0 mb-3">Step 2 of 2: Complete Purchase</h3>
              <p className="text-[#666] text-sm m-0">
                {isTxPending
                  ? "Processing your purchase..."
                  : "Please confirm the transaction in your wallet"}
              </p>
              <div className="text-xs text-[#888] mt-3">
                Buying {quantity}x {product.name} for {formattedTotal} {currencySymbol}
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-lg m-0 mb-2">Purchase Successful!</h3>
              <p className="text-[#666] text-sm m-0">
                You bought {quantity}x {product.name}
              </p>
              <button
                onClick={() => {
                  onComplete();
                }}
                className="mt-4 px-6 py-3 bg-[#00D395] text-white border-none rounded-md text-sm font-semibold cursor-pointer min-h-[44px]"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">❌</div>
              <h3 className="text-lg m-0 mb-2">Transaction Failed</h3>
              <p className="text-[#666] break-words text-sm m-0">{errorMessage}</p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 p-3 bg-white text-[#333] border border-[#e0e0e0] rounded-md text-sm font-semibold cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setStep("input");
                    setErrorMessage("");
                  }}
                  className="flex-1 p-3 bg-[#0052FF] text-white border-none rounded-md text-sm font-semibold cursor-pointer min-h-[44px]"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PurchaseModal;
