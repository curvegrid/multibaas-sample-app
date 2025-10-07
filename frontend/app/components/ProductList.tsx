"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import useMultiBaas, { type Product } from "../hooks/useMultiBaas";
import ProductCard from "./ProductCard";
import PurchaseModal from "./PurchaseModal";

/**
 * ProductList Component
 *
 * Main marketplace view showing all products.
 *
 * EDUCATIONAL: Compare to Voting.tsx in archive.
 * Similar patterns:
 * - useEffect to fetch data on mount
 * - State management for products and transactions
 * - Conditional rendering based on wallet connection
 * - Transaction status handling
 *
 * KEY DIFFERENCES:
 * - Fetches products instead of votes
 * - Opens modal for purchase (multi-step: approve + buy)
 * - No "clearVote" equivalent (purchases are final)
 */

const ProductList: React.FC = () => {
  const { isConnected } = useAccount();
  const { getProducts } = useMultiBaas();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Fetch products from marketplace
   * EDUCATIONAL: This is a view function call - no gas, no wallet needed
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedProducts = await getProducts();

      if (fetchedProducts) {
        // Filter to only show active products
        const activeProducts = fetchedProducts.filter((p) => p.active);
        setProducts(activeProducts);
      } else {
        setError("Failed to load products");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [getProducts]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /**
   * Handle product purchase
   * Opens modal for approve + buy flow
   */
  const handlePurchase = (product: Product) => {
    if (!isConnected) {
      alert("Please connect your wallet to purchase");
      return;
    }
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  /**
   * Handle purchase completion
   * Refresh products and close modal
   */
  const handlePurchaseComplete = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
    // Refresh products to show any changes
    fetchProducts();
  };

  /**
   * Handle modal close
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-[640px] my-8 mx-auto p-4 bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-center">
        <div className="w-10 h-10 mx-auto border-[5px] border-gray-900/10 border-t-[#0052FF] rounded-full animate-spin"></div>
        <p className="mt-4">Loading products...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-[640px] my-8 mx-auto p-4 bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-center">
        <p className="text-red-600">❌ {error}</p>
        <button
          onClick={fetchProducts}
          className="mt-4 px-4 py-2 bg-[#0052FF] text-white border-none rounded-md cursor-pointer hover:bg-[#0046DD] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // No products state
  if (products.length === 0) {
    return (
      <div className="max-w-[640px] my-8 mx-auto p-4 bg-white rounded-2xl shadow-[0_2px_4px_rgba(0,0,0,0.1)] text-center">
        <h2 className="text-xl">🛒 No Products Available</h2>
        <p className="text-sm text-[#666] mt-2">Check back soon for new products!</p>
      </div>
    );
  }

  // Products grid
  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8">
      <h2 className="mb-4 md:mb-6 text-center text-xl md:text-2xl font-bold">🛍️ Available Products</h2>

      {/* Wallet connection prompt */}
      {!isConnected && (
        <div className="bg-[#FFF4E5] border border-[#FFE0B2] rounded-lg p-3 mb-4 text-center text-sm">
          💡 Connect your wallet to purchase products
        </div>
      )}

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id.toString()}
            product={product}
            onPurchase={handlePurchase}
            isDisabled={!isConnected}
          />
        ))}
      </div>

      {/* Purchase Modal */}
      {selectedProduct && (
        <PurchaseModal
          isOpen={isModalOpen}
          product={selectedProduct}
          onClose={handleCloseModal}
          onComplete={handlePurchaseComplete}
        />
      )}
    </div>
  );
};

export default ProductList;
