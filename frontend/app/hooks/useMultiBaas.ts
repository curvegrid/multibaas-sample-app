"use client";
import type { PostMethodArgs, MethodCallResponse, TransactionToSignResponse, Event } from "@curvegrid/multibaas-sdk";
import type { SendTransactionParameters } from "@wagmi/core";
import { Configuration, ContractsApi, EventsApi, ChainsApi }from "@curvegrid/multibaas-sdk";
import { useAccount } from "wagmi";
import { useCallback, useMemo } from "react";

interface ChainStatus {
  chainID: number;
  blockNumber: number;
}

/**
 * Product API response (BigInts as strings from MultiBaas)
 */
interface ProductResponse {
  id: string;
  name: string;
  imageUrl: string;
  price: string;
  currencySymbol: string;
  active: boolean;
}

/**
 * Product structure matching SimpleMarketplace.sol v2.0
 */
export interface Product {
  id: bigint;
  name: string;
  imageUrl: string; // NEW in v2.0
  price: bigint;
  currencySymbol: string; // CHANGED in v2.0: was "currency: address"
  active: boolean;
}

/**
 * Order API response (BigInts as strings from MultiBaas)
 */
interface OrderResponse {
  id: string;
  buyer: string;
  productId: string;
  quantity: string;
  currencySymbol: string;
  totalPrice: string;
  timestamp: string;
}

/**
 * Order structure matching SimpleMarketplace.sol v2.0
 */
export interface Order {
  id: bigint;
  buyer: string;
  productId: bigint;
  quantity: bigint;
  currencySymbol: string; // CHANGED in v2.0: was "currency: address"
  totalPrice: bigint;
  timestamp: bigint;
}

/**
 * Extended MultiBaas hook for marketplace and token operations
 *
 * EDUCATIONAL: This hook demonstrates multi-contract interactions:
 * - Marketplace contract (products, orders, purchases)
 * - Token contracts (USDC, JPYC for balances and approvals)
 *
 * All functions use MultiBaas SDK - no direct ethers/viem calls.
 */
interface MultiBaasHook {
  // Chain status
  getChainStatus: () => Promise<ChainStatus | null>;

  // Marketplace - Product functions
  getProducts: () => Promise<Product[] | null>;
  getActiveProducts: () => Promise<Product[] | null>;
  getProduct: (productId: string) => Promise<Product | null>;

  // Marketplace - Order functions
  getOrders: () => Promise<Order[] | null>;
  getUserOrders: (userAddress: string) => Promise<Order[] | null>;
  purchaseProduct: (productId: string, quantity: string) => Promise<SendTransactionParameters>;

  // Marketplace - Admin functions (only work if connected wallet is admin)
  addProduct: (name: string, imageUrl: string, price: string, currencySymbol: string) => Promise<SendTransactionParameters>;
  removeProduct: (productId: string) => Promise<SendTransactionParameters>;

  // Admin management functions (multi-admin pattern)
  isAdmin: (address: string) => Promise<boolean | null>;
  addAdmin: (adminAddress: string) => Promise<SendTransactionParameters>;
  removeAdmin: (adminAddress: string) => Promise<SendTransactionParameters>;

  // Currency registry functions
  getCurrency: (symbol: string) => Promise<{ tokenAddress: string; symbol: string; decimals: number; active: boolean } | null>;

  // Token functions - USDC
  getUSDCBalance: (address: string) => Promise<string | null>;
  getUSDCAllowance: (owner: string, spender: string) => Promise<string | null>;
  approveUSDC: (spender: string, amount: string) => Promise<SendTransactionParameters>;

  // Token functions - JPYC
  getJPYCBalance: (address: string) => Promise<string | null>;
  getJPYCAllowance: (owner: string, spender: string) => Promise<string | null>;
  approveJPYC: (spender: string, amount: string) => Promise<SendTransactionParameters>;

  // Events
  getProductPurchasedEvents: () => Promise<Array<Event> | null>;
}

const useMultiBaas = (): MultiBaasHook => {
  const mbBaseUrl = process.env.NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL || "";
  const mbApiKey = process.env.NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY || "";

  // Marketplace contract references
  const marketplaceContractLabel = process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_LABEL || "";
  const marketplaceAddressAlias = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS_ALIAS || "";

  // Token contract references
  const usdcContractLabel = process.env.NEXT_PUBLIC_USDC_CONTRACT_LABEL || "";
  const usdcAddressAlias = process.env.NEXT_PUBLIC_USDC_ADDRESS_ALIAS || "";

  const jpycContractLabel = process.env.NEXT_PUBLIC_JPYC_CONTRACT_LABEL || "";
  const jpycAddressAlias = process.env.NEXT_PUBLIC_JPYC_ADDRESS_ALIAS || "";

  const chain = "ethereum";

  // Memoize mbConfig
  const mbConfig = useMemo(() => {
    return new Configuration({
      basePath: new URL("/api/v0", mbBaseUrl).toString(),
      accessToken: mbApiKey,
    });
  }, [mbBaseUrl, mbApiKey]);

  // Memoize APIs
  const contractsApi = useMemo(() => new ContractsApi(mbConfig), [mbConfig]);
  const eventsApi = useMemo(() => new EventsApi(mbConfig), [mbConfig]);
  const chainsApi = useMemo(() => new ChainsApi(mbConfig), [mbConfig]);

  const { address, isConnected } = useAccount();

  const getChainStatus = async (): Promise<ChainStatus | null> => {
    try {
      const response = await chainsApi.getChainStatus(chain);
      return response.data.result as ChainStatus;
    } catch (err) {
      console.error("Error getting chain status:", err);
      return null;
    }
  };

  /**
   * Generic contract function caller
   * @param contractLabel - MultiBaas contract label
   * @param addressAlias - MultiBaas address alias
   * @param methodName - Function name to call
   * @param args - Function arguments
   * @param needsSigner - Whether this call needs a from address (default: false for view calls)
   * @returns Either transaction to sign or view function result
   *
   * EDUCATIONAL: This abstraction works for ANY contract registered in MultiBaas.
   * Same function handles marketplace, USDC, and JPYC calls.
   *
   * IMPORTANT FIX: Only set 'from' for transaction calls that need signing.
   * Setting 'from' on view-only calls causes MultiBaas to create unaliased address entries.
   */
  const callContractFunction = useCallback(
    async (
      contractLabel: string,
      contractAddress: string,
      methodName: string,
      args: PostMethodArgs['args'] = [],
      needsSigner: boolean = false
    ): Promise<MethodCallResponse['output'] | TransactionToSignResponse['tx']> => {
      const payload: PostMethodArgs = {
        args,
        contractOverride: true,
        // Only set 'from' for calls that need a signer (transactions)
        // This prevents creating unaliased addresses in MultiBaas for every user
        ...(needsSigner && isConnected && address ? { from: address } : {}),
      };

      const response = await contractsApi.callContractFunction(
        chain,
        contractAddress,
        contractLabel,
        methodName,
        payload
      );

      if (response.data.result.kind === "MethodCallResponse") {
        return response.data.result.output;
      } else if (response.data.result.kind === "TransactionToSignResponse") {
        return response.data.result.tx;
      } else {
        throw new Error(`Unexpected response type: ${(response.data.result as { kind: string }).kind}`);
      }
    },
    [contractsApi, chain, isConnected, address]
  );

  // ========== MARKETPLACE FUNCTIONS ==========

  /**
   * Get all products from marketplace
   * EDUCATIONAL: View function - no wallet needed, no gas cost
   *
   * IMPORTANT: MultiBaas returns BigInt as strings in JSON.
   * We must convert them to BigInt for TypeScript compatibility.
   */
  const getProducts = useCallback(async (): Promise<Product[] | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getProducts"
      );

      // Convert BigInt fields from API strings to BigInt
      const products = (result as ProductResponse[]).map((p) => ({
        ...p,
        id: BigInt(p.id),
        price: BigInt(p.price),
      }));

      return products as Product[];
    } catch (err) {
      console.error("Error getting products:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Get only active products
   */
  const getActiveProducts = useCallback(async (): Promise<Product[] | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getActiveProducts"
      );

      // Convert BigInt fields from API strings to BigInt
      const products = (result as ProductResponse[]).map((p) => ({
        ...p,
        id: BigInt(p.id),
        price: BigInt(p.price),
      }));

      return products as Product[];
    } catch (err) {
      console.error("Error getting active products:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Get specific product by ID
   */
  const getProduct = useCallback(async (productId: string): Promise<Product | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getProduct",
        [productId]
      );

      // Convert BigInt fields from API strings to BigInt
      const product = result as ProductResponse;
      return {
        ...product,
        id: BigInt(product.id),
        price: BigInt(product.price),
      } as Product;
    } catch (err) {
      console.error("Error getting product:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Get all orders (admin view)
   */
  const getOrders = useCallback(async (): Promise<Order[] | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getOrders"
      );

      // Convert BigInt fields from API strings to BigInt
      const orders = (result as OrderResponse[]).map((o) => ({
        ...o,
        id: BigInt(o.id),
        productId: BigInt(o.productId),
        quantity: BigInt(o.quantity),
        totalPrice: BigInt(o.totalPrice),
        timestamp: BigInt(o.timestamp),
      }));

      return orders as Order[];
    } catch (err) {
      console.error("Error getting orders:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Get orders for specific user
   */
  const getUserOrders = useCallback(async (userAddress: string): Promise<Order[] | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getUserOrders",
        [userAddress]
      );

      // Convert BigInt fields from API strings to BigInt
      const orders = (result as OrderResponse[]).map((o) => ({
        ...o,
        id: BigInt(o.id),
        productId: BigInt(o.productId),
        quantity: BigInt(o.quantity),
        totalPrice: BigInt(o.totalPrice),
        timestamp: BigInt(o.timestamp),
      }));

      return orders as Order[];
    } catch (err) {
      console.error("Error getting user orders:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Purchase a product
   * EDUCATIONAL: Returns unsigned transaction - wallet will sign it
   * IMPORTANT: User must approve tokens BEFORE calling this!
   *
   * v2.0 CHANGE: No currency parameter needed - uses product's currency registry
   */
  const purchaseProduct = useCallback(async (
    productId: string,
    quantity: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      marketplaceContractLabel,
      marketplaceAddressAlias,
      "purchaseProduct",
      [productId, quantity],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Add product (admin only)
   *
   * v2.0 CHANGE: Now requires imageUrl and uses currencySymbol instead of address
   */
  const addProduct = useCallback(async (
    name: string,
    imageUrl: string,
    price: string,
    currencySymbol: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      marketplaceContractLabel,
      marketplaceAddressAlias,
      "addProduct",
      [name, imageUrl, price, currencySymbol],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Remove product (admin only)
   */
  const removeProduct = useCallback(async (
    productId: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      marketplaceContractLabel,
      marketplaceAddressAlias,
      "removeProduct",
      [productId],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  // ========== USDC TOKEN FUNCTIONS ==========

  const getUSDCBalance = useCallback(async (address: string): Promise<string | null> => {
    try {
      const result = await callContractFunction(
        usdcContractLabel,
        usdcAddressAlias,
        "balanceOf",
        [address]
      );
      return result as string;
    } catch (err) {
      console.error("Error getting USDC balance:", err);
      return null;
    }
  }, [callContractFunction, usdcContractLabel, usdcAddressAlias]);

  const getUSDCAllowance = useCallback(async (
    owner: string,
    spender: string
  ): Promise<string | null> => {
    try {
      const result = await callContractFunction(
        usdcContractLabel,
        usdcAddressAlias,
        "allowance",
        [owner, spender]
      );
      return result as string;
    } catch (err) {
      console.error("Error getting USDC allowance:", err);
      return null;
    }
  }, [callContractFunction, usdcContractLabel, usdcAddressAlias]);

  /**
   * Approve USDC spending
   * EDUCATIONAL: This must be called BEFORE purchaseProduct if paying with USDC
   */
  const approveUSDC = useCallback(async (
    spender: string,
    amount: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      usdcContractLabel,
      usdcAddressAlias,
      "approve",
      [spender, amount],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, usdcContractLabel, usdcAddressAlias]);

  // ========== JPYC TOKEN FUNCTIONS ==========

  const getJPYCBalance = useCallback(async (address: string): Promise<string | null> => {
    try {
      const result = await callContractFunction(
        jpycContractLabel,
        jpycAddressAlias,
        "balanceOf",
        [address]
      );
      return result as string;
    } catch (err) {
      console.error("Error getting JPYC balance:", err);
      return null;
    }
  }, [callContractFunction, jpycContractLabel, jpycAddressAlias]);

  const getJPYCAllowance = useCallback(async (
    owner: string,
    spender: string
  ): Promise<string | null> => {
    try {
      const result = await callContractFunction(
        jpycContractLabel,
        jpycAddressAlias,
        "allowance",
        [owner, spender]
      );
      return result as string;
    } catch (err) {
      console.error("Error getting JPYC allowance:", err);
      return null;
    }
  }, [callContractFunction, jpycContractLabel, jpycAddressAlias]);

  /**
   * Approve JPYC spending
   * EDUCATIONAL: This must be called BEFORE purchaseProduct if paying with JPYC
   */
  const approveJPYC = useCallback(async (
    spender: string,
    amount: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      jpycContractLabel,
      jpycAddressAlias,
      "approve",
      [spender, amount],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, jpycContractLabel, jpycAddressAlias]);

  // ========== ADMIN MANAGEMENT ==========

  /**
   * Check if an address is an admin
   * EDUCATIONAL: View function for role checking in frontend
   */
  const isAdmin = useCallback(async (address: string): Promise<boolean | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "isAdmin",
        [address]
      );
      return result as boolean;
    } catch (err) {
      console.error("Error checking admin status:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Add a new admin (admin-only)
   * EDUCATIONAL: Multi-admin pattern for workshop collaboration
   */
  const addAdmin = useCallback(async (
    adminAddress: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      marketplaceContractLabel,
      marketplaceAddressAlias,
      "addAdmin",
      [adminAddress],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  /**
   * Remove an admin (admin-only)
   * EDUCATIONAL: Admins can remove other admins (or themselves!)
   */
  const removeAdmin = useCallback(async (
    adminAddress: string
  ): Promise<SendTransactionParameters> => {
    return await callContractFunction(
      marketplaceContractLabel,
      marketplaceAddressAlias,
      "removeAdmin",
      [adminAddress],
      true // needsSigner: this is a transaction
    ) as SendTransactionParameters;
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  // ========== CURRENCY REGISTRY ==========

  /**
   * Get currency info from registry
   * EDUCATIONAL: Query on-chain currency metadata (address, decimals)
   */
  const getCurrency = useCallback(async (symbol: string): Promise<{ tokenAddress: string; symbol: string; decimals: number; active: boolean } | null> => {
    try {
      const result = await callContractFunction(
        marketplaceContractLabel,
        marketplaceAddressAlias,
        "getCurrency",
        [symbol]
      );
      return result as { tokenAddress: string; symbol: string; decimals: number; active: boolean };
    } catch (err) {
      console.error("Error getting currency:", err);
      return null;
    }
  }, [callContractFunction, marketplaceContractLabel, marketplaceAddressAlias]);

  // ========== EVENTS ==========

  const getProductPurchasedEvents = useCallback(async (): Promise<Array<Event> | null> => {
    try {
      const eventSignature = "ProductPurchased(uint256,address,uint256,uint256,address,uint256)";
      const response = await eventsApi.listEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        chain,
        marketplaceAddressAlias,
        marketplaceContractLabel,
        eventSignature,
        50
      );

      return response.data.result;
    } catch (err) {
      console.error("Error getting ProductPurchased events:", err);
      return null;
    }
  }, [eventsApi, chain, marketplaceAddressAlias, marketplaceContractLabel]);

  return {
    getChainStatus,
    getProducts,
    getActiveProducts,
    getProduct,
    getOrders,
    getUserOrders,
    purchaseProduct,
    addProduct,
    removeProduct,
    isAdmin,
    addAdmin,
    removeAdmin,
    getCurrency,
    getUSDCBalance,
    getUSDCAllowance,
    approveUSDC,
    getJPYCBalance,
    getJPYCAllowance,
    approveJPYC,
    getProductPurchasedEvents,
  };
};

export default useMultiBaas;
