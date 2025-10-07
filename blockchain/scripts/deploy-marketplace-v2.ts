import hre from 'hardhat';

/**
 * Deploy SimpleMarketplace v2.1 to Base Sepolia
 *
 * VERSION 2.1 IMPROVEMENTS (from 2.0):
 * - Multi-admin pattern (mapping instead of single admin)
 * - Add/remove admin functions for workshop testing
 * - Any admin can manage other admins
 * - Interactive prompt for additional admin during deployment
 * - Automatic decimal detection from token contracts
 *
 * VERSION 2.0 IMPROVEMENTS (from 1.0):
 * - Currency registry (register USDC and JPYC with symbols)
 * - Product images (imageUrl field)
 * - Cleaner frontend integration
 *
 * PREREQUISITES:
 * 1. deployment-config.base-sepolia.js configured with:
 *    - deployerPrivateKey (funded with Base Sepolia ETH)
 *    - deploymentEndpoint (MultiBaas URL)
 *    - adminApiKey (Administrator group)
 *    - jpycAddress (deployed JPYC token)
 *    - usdcAddress (Circle's USDC on Base Sepolia)
 *
 * 2. JPYC token already deployed at jpycAddress
 * 3. USDC contract imported to MultiBaas
 *
 * RUN WITH:
 *   npm run deploy:marketplace:base-sepolia
 *   # OR with sample products:
 *   npm run deploy:marketplace:base-sepolia:with-products
 *
 * INTERACTIVE PROMPTS:
 * - You will be prompted to enter an additional admin address (optional)
 * - Press Enter to skip if you don't want to add an admin during deployment
 *
 * WHAT THIS DOES:
 * 1. Prompts for additional admin address (optional)
 * 2. Deploys SimpleMarketplace v2.1 contract
 * 3. Registers it in MultiBaas with label 'simple_marketplace'
 * 4. Queries USDC and JPYC decimals from token contracts
 * 5. Registers currencies in registry with correct decimals
 * 6. Adds additional admin if provided
 * 7. Optionally adds sample products with images (using correct decimals)
 * 8. Logs contract address and MultiBaas references
 */

async function main() {
  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  console.log('\n=== Deploying SimpleMarketplace v2.1 ===');
  console.log('Deployer address:', signer.address);

  // Get deployment config
  const network = process.env['HARDHAT_NETWORK'] || 'base-sepolia';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deploymentConfig } = require(`../deployment-config.${network}`);

  console.log('JPYC Address:', deploymentConfig.jpycAddress);
  console.log('USDC Address:', deploymentConfig.usdcAddress);

  // Prompt for additional admin address
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const additionalAdmin = await new Promise<string>((resolve) => {
    rl.question('\n📝 Enter additional admin address (or press Enter to skip): ', (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (additionalAdmin && !hre.ethers.isAddress(additionalAdmin)) {
    console.error('\n❌ ERROR: Invalid Ethereum address format');
    process.exit(1);
  }

  if (additionalAdmin) {
    console.log('✅ Additional admin will be added:', additionalAdmin);
  } else {
    console.log('ℹ️  No additional admin specified');
  }

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log('Deployer balance:', hre.ethers.formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.error('\n❌ ERROR: Deployer account has no ETH!');
    console.error('Fund this address with Base Sepolia ETH:');
    console.error('- https://www.alchemy.com/faucets/base-sepolia');
    console.error('- https://docs.base.org/docs/tools/network-faucets');
    process.exit(1);
  }

  // Setup MultiBaas deployer
  await hre.mbDeployer.setup();

  // Deploy SimpleMarketplace v2.1
  console.log('\nDeploying SimpleMarketplace v2.1 contract...');
  const marketplace = await hre.mbDeployer.deploy(signer, 'SimpleMarketplace', [], {
    addressAlias: 'simple_marketplace',
    contractVersion: '2.1',
    contractLabel: 'simple_marketplace',
  });

  const marketplaceAddress = await marketplace.contract.getAddress();
  console.log('✅ SimpleMarketplace v2.1 deployed to:', marketplaceAddress);
  console.log('   MultiBaas Label:', 'simple_marketplace');
  console.log('   MultiBaas Alias:', 'simple_marketplace');
  console.log('   Version: 2.1');

  // Check deployer is admin (multi-admin pattern)
  const deployerIsAdmin = await marketplace.contract.admins(signer.address);
  console.log('   Deployer is admin:', deployerIsAdmin);
  console.log('   Multi-admin: Any admin can add/remove other admins');

  // NEW in v2: Register currencies
  console.log('\n=== Registering Currencies ===');

  // Query decimals from USDC token contract
  const usdcToken = await hre.ethers.getContractAt(
    ['function decimals() view returns (uint8)'],
    deploymentConfig.usdcAddress,
  );
  const usdcDecimals = await usdcToken.decimals();
  console.log(`Registering USDC (${usdcDecimals} decimals from contract)...`);
  const usdcTx = await marketplace.contract.registerCurrency('USDC', deploymentConfig.usdcAddress, usdcDecimals);
  await usdcTx.wait();
  console.log('✅ USDC registered');

  // Query decimals from JPYC token contract
  const jpycToken = await hre.ethers.getContractAt(
    ['function decimals() view returns (uint8)'],
    deploymentConfig.jpycAddress,
  );
  const jpycDecimals = await jpycToken.decimals();
  console.log(`Registering JPYC (${jpycDecimals} decimals from contract)...`);
  const jpycTx = await marketplace.contract.registerCurrency('JPYC', deploymentConfig.jpycAddress, jpycDecimals);
  await jpycTx.wait();
  console.log('✅ JPYC registered');

  // Verify registered currencies
  const supportedCurrencies = await marketplace.contract.getSupportedCurrencies();
  console.log('Supported currencies:', supportedCurrencies);

  // Add additional admin if specified
  if (additionalAdmin) {
    console.log('\n=== Adding Additional Admin ===');
    console.log('Adding admin:', additionalAdmin);
    const addAdminTx = await marketplace.contract.addAdmin(additionalAdmin);
    await addAdminTx.wait();

    // Verify admin was added
    const isNowAdmin = await marketplace.contract.admins(additionalAdmin);
    if (isNowAdmin) {
      console.log('✅ Additional admin added successfully');
    } else {
      console.error('❌ Failed to verify admin addition');
    }
  }

  // Optional: Add sample products for testing
  const addSampleProducts = process.env['ADD_SAMPLE_PRODUCTS'] !== 'false';

  if (addSampleProducts) {
    console.log('\n=== Adding Sample Products ===');

    /**
     * PRODUCT IMAGES: Using Unsplash for demo
     * Workshop participants can replace with:
     * - Their own Unsplash URLs
     * - Local /public/products/*.png paths
     * - IPFS hashes (production pattern)
     */

    // Product 1: Base T-Shirt (USDC)
    console.log('Adding product: Base T-shirt (25 USDC)...');
    const tx1 = await marketplace.contract.addProduct(
      'Base T-shirt',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
      hre.ethers.parseUnits('25', usdcDecimals), // 25 USDC (uses queried decimals)
      'USDC',
    );
    await tx1.wait();
    console.log('✅ Product 1 added (USDC)');

    // Product 2: Sticker Pack (JPYC)
    console.log('Adding product: Sticker Pack (500 JPYC)...');
    const tx2 = await marketplace.contract.addProduct(
      'Kesennuma Katsuo',
      'https://cookbiz.jp/soken/core/wp-content/uploads/2019/04/Fotolia_114908436_S.jpg',
      hre.ethers.parseUnits('500', jpycDecimals), // 500 JPYC (uses queried decimals)
      'JPYC',
    );
    await tx2.wait();
    console.log('✅ Product 2 added (JPYC)');

    // Product 3: Coffee Mug (USDC)
    console.log('Adding product: Coffee Mug (15 USDC)...');
    const tx3 = await marketplace.contract.addProduct(
      'Coffee Mug',
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400',
      hre.ethers.parseUnits('15', usdcDecimals), // 15 USDC (uses queried decimals)
      'USDC',
    );
    await tx3.wait();
    console.log('✅ Product 3 added (USDC)');

    // Fetch and display all products
    const products = await marketplace.contract.getProducts();
    console.log('\n=== Products in Marketplace ===');
    products.forEach((product: any) => {
      const currencySymbol = product.currencySymbol;
      const decimals = currencySymbol === 'USDC' ? usdcDecimals : jpycDecimals;
      const price = hre.ethers.formatUnits(product.price, decimals);
      console.log(`  ${product.id}: ${product.name}`);
      console.log(`      Price: ${price} ${currencySymbol}`);
      console.log(`      Image: ${product.imageUrl.substring(0, 50)}...`);
    });
  } else {
    console.log('\n💡 Skipping sample products (set ADD_SAMPLE_PRODUCTS=true to add)');
  }

  console.log('\n=== Deployment Complete ===');
  console.log('✨ v2.1 Features:');
  console.log('   ✅ Multi-admin pattern (mapping-based)');
  console.log('   ✅ Add/remove admin functions');
  console.log('   ✅ Currency registry (USDC, JPYC)');
  console.log('   ✅ Product images (imageUrl field)');
  console.log('   ✅ Frontend-friendly symbol lookup');
  console.log('   ✅ Automatic decimal detection from token contracts');
  if (additionalAdmin) {
    console.log(`   ✅ Additional admin added: ${additionalAdmin}`);
  }
  console.log('\n📊 Currency Registry:');
  console.log(`   USDC: ${usdcDecimals} decimals (queried from contract)`);
  console.log(`   JPYC: ${jpycDecimals} decimals (queried from contract)`);
  console.log('\nNext steps:');
  console.log('1. Ensure USDC contract is in MultiBaas:');
  console.log(`   Address: ${deploymentConfig.usdcAddress}`);
  console.log('   Label: fiattokenv2');
  console.log('   Alias: usdc');
  console.log('2. Ensure JPYC is registered in MultiBaas:');
  console.log(`   Address: ${deploymentConfig.jpycAddress}`);
  console.log('   Label: fiattokenv2');
  console.log('   Alias: jpyc');
  console.log('3. Update frontend/.env.development with:');
  console.log(`   NEXT_PUBLIC_MARKETPLACE_ADDRESS_ALIAS='simple_marketplace'`);
  console.log('4. Configure CORS in MultiBaas for your frontend URL');
  console.log('\nMarketplace v2.1 is ready for frontend integration!');
  console.log('Workshop participants can now test multi-admin functionality.');
  console.log('=====================================\n');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
