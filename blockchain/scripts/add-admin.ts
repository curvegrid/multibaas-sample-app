import hre from 'hardhat';

/**
 * Add Admin to SimpleMarketplace v2.1
 *
 * This script allows the current admin to add a new admin address.
 * Useful for workshop participants to grant admin access to each other.
 *
 * USAGE:
 *   # Add admin interactively (will prompt for address)
 *   HARDHAT_NETWORK=base-sepolia npm exec -- ts-node scripts/add-admin.ts
 *
 *   # Add admin with address argument
 *   HARDHAT_NETWORK=base-sepolia npm exec -- ts-node scripts/add-admin.ts 0x1234567890123456789012345678901234567890
 *
 * PREREQUISITES:
 * - Marketplace v2.1 deployed
 * - You are an existing admin (check with is-admin.ts)
 * - Deployer wallet has gas (ETH on Base Sepolia)
 */

async function main() {
  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  console.log('\n=== Add Admin to SimpleMarketplace v2.1 ===');
  console.log('Current signer:', signer.address);

  // Get deployment config
  const network = process.env['HARDHAT_NETWORK'] || 'base-sepolia';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deploymentConfig } = require(`../deployment-config.${network}`);

  // Get new admin address from command line args, env var, or prompt
  let newAdminAddress = process.argv[2] || process.env['ADMIN_ADDRESS'];

  if (!newAdminAddress) {
    // Prompt for address
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    newAdminAddress = await new Promise<string>((resolve) => {
      rl.question('Enter admin address to add (0x...): ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // Validate address format
  if (!hre.ethers.isAddress(newAdminAddress)) {
    console.error('\n❌ ERROR: Invalid Ethereum address format');
    console.error('Address must be 42 characters starting with 0x');
    process.exit(1);
  }

  console.log('New admin address:', newAdminAddress);

  // Get marketplace contract instance
  const marketplaceAddress = '0xafe77b3D4312449c8aa7059B8798ad6D5937c872'; // v2.1

  console.log('\nFetching marketplace contract...');
  console.log('Marketplace address:', marketplaceAddress);

  // Get contract instance using ethers
  const marketplace = await hre.ethers.getContractAt('SimpleMarketplace', marketplaceAddress, signer);

  // Check if current signer is admin
  console.log('\nChecking current admin status...');
  const isCurrentAdmin = await marketplace.admins(signer.address);
  if (!isCurrentAdmin) {
    console.error('\n❌ ERROR: Current signer is not an admin!');
    console.error('Only existing admins can add new admins.');
    console.error('Current signer:', signer.address);
    process.exit(1);
  }
  console.log('✅ Current signer is an admin');

  // Check if new address is already admin
  console.log('\nChecking if new address is already admin...');
  const isAlreadyAdmin = await marketplace.admins(newAdminAddress);
  if (isAlreadyAdmin) {
    console.log('\n⚠️  WARNING: This address is already an admin!');
    console.log('Address:', newAdminAddress);
    console.log('No action needed.');
    process.exit(0);
  }
  console.log('✅ Address is not yet an admin');

  // Add admin
  console.log('\n🔄 Adding new admin...');
  console.log('Transaction will be sent from:', signer.address);
  console.log('New admin:', newAdminAddress);

  const tx = await marketplace.addAdmin(newAdminAddress);
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Transaction confirmed!');
  console.log('Block number:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Verify admin was added
  console.log('\n🔍 Verifying admin status...');
  const isNowAdmin = await marketplace.admins(newAdminAddress);
  if (isNowAdmin) {
    console.log('✅ SUCCESS! New admin added successfully');
    console.log('Address:', newAdminAddress);
  } else {
    console.error('❌ ERROR: Failed to verify admin status');
    console.error('Transaction succeeded but admin check failed');
    process.exit(1);
  }

  console.log('\n=== Admin Added Successfully ===');
  console.log('New admin can now:');
  console.log('- Add/remove products');
  console.log('- Add/remove other admins');
  console.log('- Withdraw marketplace tokens');
  console.log('- Access Admin panel in frontend');
  console.log('\nBase Sepolia Explorer:');
  console.log(`https://sepolia.basescan.org/tx/${tx.hash}`);
  console.log('=====================================\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
