"use client";
import React, { useState } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import useMultiBaas from "../hooks/useMultiBaas";

/**
 * AdminPanel Component
 *
 * Admin-only interface for managing marketplace products.
 *
 * EDUCATIONAL: This demonstrates:
 * - Role-based access (admin-only functions)
 * - Form handling with multiple inputs
 * - Transaction submission pattern
 * - Input validation and error handling
 *
 * KEY FEATURES:
 * - Add products with image URLs
 * - Select currency (USDC or JPYC)
 * - Remove products by ID
 * - Real-time transaction status
 *
 * WORKSHOP NOTE: In production, you'd verify admin role on backend.
 * Here we rely on contract's onlyAdmin modifier for security.
 */

const AdminPanel: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { addProduct, removeProduct, addAdmin, removeAdmin } = useMultiBaas();

  // Form state
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [currency, setCurrency] = useState<"USDC" | "JPYC">("USDC");
  const [removeProductId, setRemoveProductId] = useState("");
  const [newAdminAddress, setNewAdminAddress] = useState("");
  const [removeAdminAddress, setRemoveAdminAddress] = useState("");

  // Transaction state
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const { data: txReceipt, isLoading: isTxPending } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  /**
   * Handle add product submission
   */
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    if (!productName || !productImage || !productPrice) {
      alert("Please fill in all fields");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Preparing transaction...");

      // Convert price to correct decimals
      const decimals = currency === "USDC" ? 6 : 18;
      const priceInWei = parseUnits(productPrice, decimals);

      // Call MultiBaas to prepare transaction
      const tx = await addProduct(
        productName,
        productImage,
        priceInWei.toString(),
        currency
      );

      setStatusMessage("Please confirm in your wallet...");

      // Send transaction
      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
      setStatusMessage("Transaction submitted, waiting for confirmation...");
    } catch (err) {
      console.error("Add product error:", err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Transaction failed"}`);
      setIsProcessing(false);
    }
  };

  /**
   * Handle remove product submission
   */
  const handleRemoveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    if (!removeProductId) {
      alert("Please enter a product ID");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Preparing transaction...");

      const tx = await removeProduct(removeProductId);

      setStatusMessage("Please confirm in your wallet...");

      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
      setStatusMessage("Transaction submitted, waiting for confirmation...");
    } catch (err) {
      console.error("Remove product error:", err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Transaction failed"}`);
      setIsProcessing(false);
    }
  };

  /**
   * Handle add admin submission
   */
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    if (!newAdminAddress) {
      alert("Please enter an admin address");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Preparing transaction...");

      const tx = await addAdmin(newAdminAddress);

      setStatusMessage("Please confirm in your wallet...");

      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
      setStatusMessage("Transaction submitted, waiting for confirmation...");
    } catch (err) {
      console.error("Add admin error:", err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Transaction failed"}`);
      setIsProcessing(false);
    }
  };

  /**
   * Handle remove admin submission
   */
  const handleRemoveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    if (!removeAdminAddress) {
      alert("Please enter an admin address");
      return;
    }

    try {
      setIsProcessing(true);
      setStatusMessage("Preparing transaction...");

      const tx = await removeAdmin(removeAdminAddress);

      setStatusMessage("Please confirm in your wallet...");

      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
      setStatusMessage("Transaction submitted, waiting for confirmation...");
    } catch (err) {
      console.error("Remove admin error:", err);
      setStatusMessage(`Error: ${err instanceof Error ? err.message : "Transaction failed"}`);
      setIsProcessing(false);
    }
  };

  /**
   * Monitor transaction confirmation
   */
  React.useEffect(() => {
    if (txReceipt) {
      setStatusMessage("✅ Transaction confirmed!");
      setIsProcessing(false);
      setTxHash(undefined);

      // Reset forms
      setProductName("");
      setProductImage("");
      setProductPrice("");
      setRemoveProductId("");
      setNewAdminAddress("");
      setRemoveAdminAddress("");

      setTimeout(() => setStatusMessage(""), 3000);
    }
  }, [txReceipt]);

  if (!isConnected) {
    return (
      <div
        style={{
          backgroundColor: "#FFF4E5",
          border: "1px solid #FFE0B2",
          borderRadius: "8px",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: "1.125rem", margin: "0 0 0.5rem 0" }}>🔐 Admin Panel</h3>
        <p style={{ fontSize: "0.875rem", margin: 0 }}>Connect your wallet to access admin functions</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#F5F5F5",
        border: "1px solid #E0E0E0",
        borderRadius: "12px",
        padding: "1rem",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1.25rem" }}>🔐 Admin Panel</h2>
      <p style={{ color: "#666", marginBottom: "1rem", fontSize: "0.75rem", wordBreak: "break-all" }}>
        Connected as: <code>{address}</code>
      </p>

      {/* Status Message */}
      {statusMessage && (
        <div
          style={{
            backgroundColor: statusMessage.includes("Error") ? "#FFEBEE" : "#E8F5E9",
            color: statusMessage.includes("Error") ? "#C62828" : "#2E7D32",
            padding: "0.75rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Add Product Form */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "0.75rem" }}>Add New Product</h3>
        <form onSubmit={handleAddProduct}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g., Base T-shirt"
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #E0E0E0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
              Image URL
            </label>
            <input
              type="url"
              value={productImage}
              onChange={(e) => setProductImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #E0E0E0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
              💡 Use Unsplash or any image URL
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Price
              </label>
              <input
                type="number"
                step="0.000001"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="25"
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #E0E0E0",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "USDC" | "JPYC")}
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #E0E0E0",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="USDC">USDC</option>
                <option value="JPYC">JPYC</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || isTxPending}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: isProcessing ? "#CCC" : "#00D395",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isProcessing ? "not-allowed" : "pointer",
              minHeight: "44px",
            }}
          >
            {isProcessing ? "Processing..." : "Add Product"}
          </button>
        </form>
      </div>

      {/* Remove Product Form */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "0.75rem" }}>Remove Product</h3>
        <form onSubmit={handleRemoveProduct}>
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
              Product ID
            </label>
            <input
              type="number"
              value={removeProductId}
              onChange={(e) => setRemoveProductId(e.target.value)}
              placeholder="1"
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #E0E0E0",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
            <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
              💡 Product ID shown at bottom of each product card
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing || isTxPending}
            style={{
              width: "100%",
              padding: "0.75rem",
              backgroundColor: isProcessing ? "#CCC" : "#FF5252",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: isProcessing ? "not-allowed" : "pointer",
              minHeight: "44px",
            }}
          >
            {isProcessing ? "Processing..." : "Remove Product"}
          </button>
        </form>
      </div>

      {/* Admin Management Section */}
      <div
        style={{
          backgroundColor: "#E3F2FD",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "0.5rem", color: "#0052FF", fontSize: "1.125rem" }}>
          👥 Admin Management
        </h2>
        <p style={{ fontSize: "0.75rem", color: "#666", marginBottom: "1rem" }}>
          Multi-admin pattern allows workshop participants to add/remove admins for testing.
        </p>

        {/* Add Admin Form */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "0.75rem",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "0.75rem" }}>Add New Admin</h3>
          <form onSubmit={handleAddAdmin}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Admin Address
              </label>
              <input
                type="text"
                value={newAdminAddress}
                onChange={(e) => setNewAdminAddress(e.target.value)}
                placeholder="0x..."
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #E0E0E0",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                💡 Enter Ethereum address (0x...)
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || isTxPending}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: isProcessing ? "#CCC" : "#0052FF",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: isProcessing ? "not-allowed" : "pointer",
                minHeight: "44px",
              }}
            >
              {isProcessing ? "Processing..." : "Add Admin"}
            </button>
          </form>
        </div>

        {/* Remove Admin Form */}
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "1rem",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: "1rem", marginBottom: "0.75rem" }}>Remove Admin</h3>
          <form onSubmit={handleRemoveAdmin}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Admin Address
              </label>
              <input
                type="text"
                value={removeAdminAddress}
                onChange={(e) => setRemoveAdminAddress(e.target.value)}
                placeholder="0x..."
                disabled={isProcessing}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #E0E0E0",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                ⚠️ Cannot remove yourself as admin
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || isTxPending}
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: isProcessing ? "#CCC" : "#FF9800",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: isProcessing ? "not-allowed" : "pointer",
                minHeight: "44px",
              }}
            >
              {isProcessing ? "Processing..." : "Remove Admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
