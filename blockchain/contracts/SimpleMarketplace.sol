// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SimpleMarketplace v2
 * @notice A basic ecommerce marketplace accepting USDC and JPYC payments
 * @dev Educational contract demonstrating ERC20 token integration
 *
 *
 * EDUCATIONAL PURPOSE: This contract shows how to:
 * 1. Integrate with external ERC20 tokens (USDC, JPYC)
 * 2. Use approve + transferFrom pattern for payments
 * 3. Implement admin vs user permissions
 * 4. Track orders and emit events
 * 5. Work with MultiBaas for frontend integration
 *
 * KEY CONCEPTS:
 *
 * 1. ERC20 APPROVE + TRANSFERFROM PATTERN
 *    - User approves marketplace to spend their tokens
 *    - Marketplace calls transferFrom to collect payment
 *    - This is the standard pattern for token payments
 *
 * 2. CURRENCY REGISTRY PATTERN
 *    - Map human-readable symbols to token addresses
 *    - Frontend uses "USDC" instead of "0x036C..."
 *    - Easy to add new currencies without frontend changes
 *    - Includes decimal information for proper display
 *
 * 3. MULTI-TOKEN SUPPORT
 *    - Products can be priced in USDC or JPYC
 *    - Same interface for both (ERC20 standard)
 *    - Currency specified by symbol (e.g., "USDC")
 *
 * 4. ADMIN CONTROLS
 *    - Multi-admin pattern: mapping(address => bool)
 *    - Only admins can add/remove products
 *    - Only admins can register currencies
 *    - Any admin can add/remove other admins
 *    - Workshop-friendly for testing access control
 */

/**
 * @dev Minimal ERC20 interface for token transfers
 * We need transferFrom for collecting payments and transfer for withdrawals
 */
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract SimpleMarketplace {
    // State variables
    mapping(address => bool) public admins; // Multi-admin support
    uint256 public nextProductId;
    uint256 public nextOrderId;

    /**
     * @dev Currency structure 
     * @param tokenAddress ERC20 contract address
     * @param symbol Human-readable symbol (e.g., "USDC", "JPYC")
     * @param decimals Token decimals for display (USDC=6, JPYC=18)
     * @param active Whether currency is accepted
     *
     * EDUCATIONAL: Currency registry pattern separates token metadata
     * from product data. This makes frontend code cleaner and allows
     * adding new currencies without frontend changes.
     *
     * PRODUCTION PATTERN: Many DeFi protocols use similar registries
     * to manage multiple token types (Uniswap, Aave, Compound).
     */
    struct Currency {
        address tokenAddress;
        string symbol;
        uint8 decimals;
        bool active;
    }

    /**
     * @dev Product structure 
     * @param id Unique product identifier
     * @param name Product name/description
     * @param imageUrl URL to product image (IPFS, CDN, or local)
     * @param price Price in token's smallest unit (e.g., USDC has 6 decimals)
     * @param currencySymbol Symbol of accepted token (e.g., "USDC")
     * @param active Whether product is available for purchase
     *
     * EDUCATIONAL:
     * - Added imageUrl for richer UI (hybrid on-chain/off-chain data)
     * - Changed currency from address to string symbol
     * - Structs bundle related data together
     * - Better than separate mappings for each field
     *
     * WHY imageUrl ON-CHAIN?
     * - Workshop simplicity (no separate database)
     * - Can use placeholder URLs (Unsplash) or local paths
     * - Production: Consider IPFS hashes for immutability
     * - Alternative: Off-chain catalog with on-chain product IDs only
     */
    struct Product {
        uint256 id;
        string name;
        string imageUrl;      // NEW in v2
        uint256 price;
        string currencySymbol; // CHANGED in v2: was "address currency"
        bool active;
    }

    /**
     * @dev Order structure tracking purchases 
     * @param id Unique order identifier
     * @param buyer Address that made the purchase
     * @param productId Which product was purchased
     * @param quantity How many units purchased
     * @param currencySymbol Which token was used (e.g., "USDC", "JPYC")
     * @param totalPrice Total amount paid (price * quantity)
     * @param timestamp When the purchase occurred
     *
     * EDUCATIONAL: Orders are immutable once created.
     * This creates an on-chain purchase history.
     *
     * CHANGED in v2: currency is now string symbol instead of address
     */
    struct Order {
        uint256 id;
        address buyer;
        uint256 productId;
        uint256 quantity;
        string currencySymbol; // CHANGED in v2: was "address currency"
        uint256 totalPrice;
        uint256 timestamp;
    }

    // Storage mappings
    mapping(uint256 => Product) public products;
    mapping(uint256 => Order) public orders;
    mapping(address => uint256[]) public userOrders; // buyer => order IDs

    // Currency registry 
    mapping(string => Currency) public currencies; // symbol => Currency
    string[] public currencySymbols; // Array of registered symbols

    // Events
    /**
     * @dev Emitted when a currency is registered 
     */
    event CurrencyRegistered(string indexed symbol, address indexed tokenAddress, uint8 decimals);

    /**
     * @dev Emitted when a product is added 
     * EDUCATIONAL: Events are indexed for off-chain filtering
     * The 'indexed' keyword allows filtering by that parameter
     *
     * CHANGED in v2: Added imageUrl, currency is now symbol string
     */
    event ProductAdded(
        uint256 indexed productId,
        string name,
        string imageUrl,
        uint256 price,
        string indexed currencySymbol
    );

    /**
     * @dev Emitted when a product is removed/deactivated
     */
    event ProductRemoved(uint256 indexed productId);

    /**
     * @dev Emitted when a purchase is made 
     * EDUCATIONAL: This event can be listened to by:
     * - Frontend for real-time updates
     * - MultiBaas Events API for order history
     * - Analytics tools for sales tracking
     *
     * CHANGED in v2: currency is now symbol string instead of address
     */
    event ProductPurchased(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 indexed productId,
        uint256 quantity,
        string currencySymbol,
        uint256 totalPrice
    );

    /**
     * @dev Emitted when an admin is added
     */
    event AdminAdded(address indexed admin);

    /**
     * @dev Emitted when an admin is removed
     */
    event AdminRemoved(address indexed admin);

    // Modifiers
    /**
     * @dev Restricts function access to admins only
     * EDUCATIONAL: Modifiers are reusable access control logic
     *
     * UPDATED: Now checks mapping instead of single address
     * This allows multiple admins for workshop collaboration
     */
    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admin can call this function");
        _;
    }

    /**
     * @dev Constructor sets the deployer as initial admin
     * EDUCATIONAL: Constructor runs once during deployment
     *
     * NOTE: Currencies must be registered after deployment.
     * See deployment script for registerCurrency() calls.
     *
     * UPDATED: Sets deployer in admins mapping instead of single admin variable
     */
    constructor() {
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
        nextProductId = 1; // Start product IDs at 1 (0 reserved for "not found")
        nextOrderId = 1;
    }

    // Currency Management 

    /**
     * @dev Register a new currency for the marketplace 
     * @param symbol Human-readable symbol (e.g., "USDC", "JPYC")
     * @param tokenAddress ERC20 contract address
     * @param decimals Token decimals (USDC=6, JPYC=18)
     *
     * EDUCATIONAL: Currency registry pattern
     * - Admin registers currencies once during setup
     * - Frontend can query currencies via getSupportedCurrencies()
     * - Products reference currencies by symbol
     * - Easy to add new currencies without frontend changes
     *
     * WHY THIS IS BETTER THAN v1:
     * - v1: Frontend hardcoded 0x036C... → "USDC" mapping
     * - v2: Contract provides mapping, frontend stays clean
     * - Adding new currency: Just call this function, no frontend changes
     *
     * PRODUCTION PATTERN:
     * - Many DeFi protocols use similar registries
     * - Consider adding price oracles for dynamic pricing
     * - Consider multi-sig for currency registration in production
     */
    function registerCurrency(
        string memory symbol,
        address tokenAddress,
        uint8 decimals
    ) external onlyAdmin {
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(tokenAddress != address(0), "Invalid token address");
        require(!currencies[symbol].active, "Currency already registered");

        currencies[symbol] = Currency({
            tokenAddress: tokenAddress,
            symbol: symbol,
            decimals: decimals,
            active: true
        });

        currencySymbols.push(symbol);
        emit CurrencyRegistered(symbol, tokenAddress, decimals);
    }

    /**
     * @dev Get currency details by symbol 
     * @param symbol Currency symbol (e.g., "USDC")
     * @return Currency struct
     */
    function getCurrency(string memory symbol) external view returns (Currency memory) {
        require(currencies[symbol].active, "Currency not supported");
        return currencies[symbol];
    }

    /**
     * @dev Get all registered currency symbols 
     * @return Array of currency symbols
     */
    function getSupportedCurrencies() external view returns (string[] memory) {
        return currencySymbols;
    }

    // Admin functions

    /**
     * @dev Add a new product to the marketplace 
     * @param name Product name/description
     * @param imageUrl URL to product image
     * @param price Price in token's smallest unit
     * @param currencySymbol Symbol of accepted currency (e.g., "USDC")
     *
     * EDUCATIONAL PATTERN:
     * - Only admin can add products
     * - Product starts as active by default
     * - Event emitted for off-chain indexing
     * - Returns product ID for reference
     *
     * CHANGES in v2:
     * - Added imageUrl parameter for product images
     * - Changed currency from address to symbol string
     * - Validates currency is registered before accepting
     *
     * USAGE EXAMPLE:
     *   addProduct(
     *     "Base T-Shirt",
     *     "https://images.unsplash.com/photo-...",
     *     25000000,  // 25 USDC (6 decimals)
     *     "USDC"
     *   );
     */
    function addProduct(
        string memory name,
        string memory imageUrl,
        uint256 price,
        string memory currencySymbol
    ) external onlyAdmin returns (uint256) {
        require(price > 0, "Price must be greater than zero");
        require(bytes(name).length > 0, "Product name cannot be empty");
        require(bytes(imageUrl).length > 0, "Image URL cannot be empty");
        require(currencies[currencySymbol].active, "Currency not supported");

        uint256 productId = nextProductId++;

        products[productId] = Product({
            id: productId,
            name: name,
            imageUrl: imageUrl,
            price: price,
            currencySymbol: currencySymbol,
            active: true
        });

        emit ProductAdded(productId, name, imageUrl, price, currencySymbol);
        return productId;
    }

    /**
     * @dev Remove (deactivate) a product
     * @param productId ID of product to remove
     *
     * EDUCATIONAL: We don't actually delete the product,
     * just mark it as inactive. This preserves history.
     */
    function removeProduct(uint256 productId) external onlyAdmin {
        require(products[productId].id != 0, "Product does not exist");
        products[productId].active = false;
        emit ProductRemoved(productId);
    }

    /**
     * @dev Add a new admin
     * @param newAdmin Address to grant admin privileges
     *
     * EDUCATIONAL: Multi-admin pattern for workshop collaboration
     * - Any existing admin can add new admins
     * - Allows workshop participants to test admin features
     * - In production, consider more restrictive access (super admin only)
     */
    function addAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        require(!admins[newAdmin], "Address is already an admin");
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    /**
     * @dev Remove an admin
     * @param admin Address to revoke admin privileges
     *
     * EDUCATIONAL: Admins can remove other admins
     * - Useful for workshop role rotation
     * - SECURITY NOTE: An admin can remove themselves (be careful!)
     * - In production, consider preventing self-removal or requiring multi-sig
     */
    function removeAdmin(address admin) external onlyAdmin {
        require(admin != address(0), "Invalid admin address");
        require(admins[admin], "Address is not an admin");
        admins[admin] = false;
        emit AdminRemoved(admin);
    }

    /**
     * @dev Check if an address is an admin
     * @param account Address to check
     * @return bool True if address is an admin
     *
     * EDUCATIONAL: Helper function for frontend to check admin status
     * - Used to show/hide admin UI elements
     * - View function (no gas cost)
     */
    function isAdmin(address account) external view returns (bool) {
        return admins[account];
    }

    // User functions

    /**
     * @dev Purchase a product with ERC20 tokens 
     * @param productId ID of product to purchase
     * @param quantity Number of units to purchase
     *
     * EDUCATIONAL - ERC20 APPROVE + TRANSFERFROM FLOW:
     *
     * FRONTEND MUST DO THIS FIRST:
     * 1. Get product currency: const product = await getProduct(productId)
     * 2. Get currency address: const currency = await getCurrency(product.currencySymbol)
     * 3. Check allowance: token.allowance(buyer, marketplace)
     * 4. If insufficient: Call token.approve(marketplace, totalPrice)
     * 5. Wait for approval transaction to confirm
     * 6. Then call this purchaseProduct function
     *
     * THIS FUNCTION DOES:
     * 1. Validates product and quantity
     * 2. Looks up token address from currency registry 
     * 3. Calculates total price
     * 4. Calls token.transferFrom(buyer, marketplace, totalPrice)
     * 5. Records the order
     * 6. Emits event
     *
     * WHY TRANSFERFROM?
     * - Allows marketplace to "pull" payment
     * - User explicitly approves amount first
     * - More secure than sending tokens then hoping for product
     * - Standard pattern for token-based purchases
     *
     * CHANGES in v2:
     * - Uses currency registry to get token address
     * - Frontend doesn't need to hardcode currency addresses
     */
    function purchaseProduct(uint256 productId, uint256 quantity) external returns (uint256) {
        require(quantity > 0, "Quantity must be greater than zero");

        Product memory product = products[productId];
        require(product.id != 0, "Product does not exist");
        require(product.active, "Product is not available");

        // Look up currency from registry 
        Currency memory currency = currencies[product.currencySymbol];
        require(currency.active, "Currency not supported");

        uint256 totalPrice = product.price * quantity;

        // Use ERC20 transferFrom to collect payment
        // IMPORTANT: User must have approved this contract first!
        IERC20 token = IERC20(currency.tokenAddress);
        bool success = token.transferFrom(msg.sender, address(this), totalPrice);
        require(success, "Payment transfer failed");

        // Record the order
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            id: orderId,
            buyer: msg.sender,
            productId: productId,
            quantity: quantity,
            currencySymbol: product.currencySymbol, // Store symbol, not address
            totalPrice: totalPrice,
            timestamp: block.timestamp
        });

        // Track user's orders
        userOrders[msg.sender].push(orderId);

        emit ProductPurchased(orderId, msg.sender, productId, quantity, product.currencySymbol, totalPrice);

        return orderId;
    }

    // View functions

    /**
     * @dev Get all products (active and inactive)
     * @return Array of all products
     *
     * EDUCATIONAL: This returns a dynamic array.
     * In production, consider pagination for gas efficiency.
     * For small marketplaces (<100 products), this is fine.
     *
     * MULTIBAAS PATTERN:
     * Frontend calls this via MultiBaas SDK:
     *   const products = await callContractFunction("getProducts");
     * No wallet connection needed (view function).
     */
    function getProducts() external view returns (Product[] memory) {
        uint256 totalProducts = nextProductId - 1;
        Product[] memory allProducts = new Product[](totalProducts);

        for (uint256 i = 1; i <= totalProducts; i++) {
            allProducts[i - 1] = products[i];
        }

        return allProducts;
    }

    /**
     * @dev Get all active products
     * @return Array of active products only
     */
    function getActiveProducts() external view returns (Product[] memory) {
        uint256 totalProducts = nextProductId - 1;

        // First pass: count active products
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= totalProducts; i++) {
            if (products[i].active) {
                activeCount++;
            }
        }

        // Second pass: collect active products
        Product[] memory activeProducts = new Product[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalProducts; i++) {
            if (products[i].active) {
                activeProducts[index] = products[i];
                index++;
            }
        }

        return activeProducts;
    }

    /**
     * @dev Get specific product details
     * @param productId ID of product to retrieve
     * @return Product struct
     */
    function getProduct(uint256 productId) external view returns (Product memory) {
        require(products[productId].id != 0, "Product does not exist");
        return products[productId];
    }

    /**
     * @dev Get all orders (admin view)
     * @return Array of all orders
     *
     * EDUCATIONAL: This is useful for admin dashboard.
     * Shows all purchases across all users.
     */
    function getOrders() external view returns (Order[] memory) {
        uint256 totalOrders = nextOrderId - 1;
        Order[] memory allOrders = new Order[](totalOrders);

        for (uint256 i = 1; i <= totalOrders; i++) {
            allOrders[i - 1] = orders[i];
        }

        return allOrders;
    }

    /**
     * @dev Get orders for specific user
     * @param user Address of buyer
     * @return Array of user's orders
     *
     * EDUCATIONAL: This shows purchase history for one user.
     * Frontend can call this with connected wallet address.
     *
     * MULTIBAAS PATTERN:
     * Frontend calls:
     *   const myOrders = await callContractFunction("getUserOrders", [address]);
     */
    function getUserOrders(address user) external view returns (Order[] memory) {
        uint256[] memory orderIds = userOrders[user];
        Order[] memory userOrdersList = new Order[](orderIds.length);

        for (uint256 i = 0; i < orderIds.length; i++) {
            userOrdersList[i] = orders[orderIds[i]];
        }

        return userOrdersList;
    }

    /**
     * @dev Get specific order details
     * @param orderId ID of order to retrieve
     * @return Order struct
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        require(orders[orderId].id != 0, "Order does not exist");
        return orders[orderId];
    }

    /**
     * @dev Admin can withdraw collected tokens 
     * @param currencySymbol Symbol of token to withdraw (e.g., "USDC", "JPYC")
     *
     * EDUCATIONAL: Revenue collection function.
     * In production, consider more sophisticated treasury management.
     *
     * CHANGED in v2: Uses currency symbol instead of address
     * UPDATED: Multi-admin - withdraws to calling admin (msg.sender)
     */
    function withdrawTokens(string memory currencySymbol) external onlyAdmin {
        Currency memory currency = currencies[currencySymbol];
        require(currency.active, "Currency not supported");

        IERC20 token = IERC20(currency.tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        bool success = token.transfer(msg.sender, balance);
        require(success, "Withdrawal failed");
    }
}

/**
 * DEPLOYMENT NOTES v2.0 (see scripts/deploy-marketplace-v2.ts):
 *
 * This contract is deployed via MultiBaas plugin:
 *   await hre.mbDeployer.deploy(signer, 'SimpleMarketplace', [], {
 *     addressAlias: 'simple_marketplace_v2',
 *     contractVersion: '2.0',
 *     contractLabel: 'simple_marketplace'
 *   });
 *
 * No constructor arguments needed (admin = deployer).
 *
 * AFTER DEPLOYMENT :
 * 1. Register currencies:
 *    await marketplace.registerCurrency("USDC", usdcAddress, 6);
 *    await marketplace.registerCurrency("JPYC", jpycAddress, 18);
 * 2. Add products with images:
 *    await marketplace.addProduct(
 *      "Base T-Shirt",
 *      "https://images.unsplash.com/photo-...",
 *      25000000,  // 25 USDC
 *      "USDC"
 *    );
 * 3. Register USDC and JPYC contracts in MultiBaas
 * 4. Frontend references contract labels via MultiBaas SDK
 *
 * FRONTEND INTEGRATION v2 (see frontend/app/hooks/useMultiBaas.ts):
 *
 * Purchase flow:
 * 1. const products = await getProducts();
 * 2. User selects product (currency is in product.currencySymbol)
 * 3. const currency = await getCurrency(product.currencySymbol);
 * 4. const allowance = await token.allowance(user, marketplace);
 * 5. if (allowance < price) {
 *      const approveTx = await approve(currency.tokenAddress, marketplace, price);
 *      await sendTransactionAsync(approveTx);
 *      await waitForReceipt();
 *    }
 * 6. const purchaseTx = await purchaseProduct(productId, quantity);
 * 7. await sendTransactionAsync(purchaseTx);
 * 8. await waitForReceipt();
 * 9. Refresh products and orders
 *
 * KEY v2 IMPROVEMENTS:
 * - Frontend gets currency info from contract (getCurrency)
 * - No hardcoded address mappings in frontend
 * - Product images displayed from imageUrl field
 * - Easy to add new currencies without frontend changes
 *
 * See archived Voting.tsx for similar transaction flow patterns.
 */
