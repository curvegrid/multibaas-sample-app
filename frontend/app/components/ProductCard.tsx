"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "../hooks/useMultiBaas";
import useMultiBaas from "../hooks/useMultiBaas";
import { formatUnits } from "viem";

/**
 * ProductCard Component
 *
 * Displays individual product with:
 * - Product name
 * - Price in USDC or JPYC (queried from currency registry)
 * - Buy button
 * - Visual currency indicator
 *
 * EDUCATIONAL: v2.0 improvement - queries currency decimals from on-chain registry
 * instead of hardcoding. This ensures frontend always matches contract state.
 */

interface ProductCardProps {
  product: Product;
  onPurchase: (product: Product) => void;
  isDisabled?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onPurchase, isDisabled }) => {
  const { getCurrency } = useMultiBaas();
  const [decimals, setDecimals] = useState<number>(18); // Default to 18 while loading

  // Fetch currency info from on-chain registry
  useEffect(() => {
    const fetchCurrency = async () => {
      const currency = await getCurrency(product.currencySymbol);
      if (currency) {
        setDecimals(currency.decimals);
      }
    };
    fetchCurrency();
  }, [product.currencySymbol, getCurrency]);

  // v2.0: Currency symbol is now stored directly in product
  const currencySymbol = product.currencySymbol;

  // Format price for display using on-chain decimals
  const formattedPrice = formatUnits(product.price, decimals);

  return (
    <div
      className={`border border-[#e0e0e0] rounded-lg p-4 transition-all duration-200 ${
        product.active
          ? "bg-white cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          : "bg-[#f5f5f5] opacity-60 cursor-not-allowed"
      }`}
    >
      {/* Product Image - NEW in v2.0 */}
      {product.imageUrl && (
        <div className="mb-3 rounded-md overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={400}
            height={180}
            className="w-full h-[180px] object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Product Name */}
      <h3 className="m-0 mb-2 text-lg font-semibold">
        {product.name}
      </h3>

      {/* Price */}
      <div className="mb-3">
        <span className="text-[1.375rem] font-bold">{formattedPrice}</span>
        <span
          className={`ml-2 text-sm font-semibold ${
            currencySymbol === "USDC" ? "text-[#2775CA]" : "text-[#00D395]"
          }`}
        >
          {currencySymbol}
        </span>
      </div>

      {/* Status & Buy Button */}
      {!product.active ? (
        <div className="text-[#888] italic text-sm">Unavailable</div>
      ) : (
        <button
          onClick={() => onPurchase(product)}
          disabled={isDisabled}
          className={`w-full px-3 py-3 text-white border-none rounded-md text-sm font-semibold transition-colors min-h-[44px] ${
            isDisabled
              ? "bg-[#ccc] cursor-not-allowed"
              : "bg-[#0052FF] cursor-pointer hover:bg-[#0041CC]"
          }`}
        >
          Buy Now
        </button>
      )}

      {/* Product ID (for debugging) */}
      <div className="mt-2 text-xs text-[#888]">
        Product #{product.id.toString()}
      </div>
    </div>
  );
};

export default ProductCard;
