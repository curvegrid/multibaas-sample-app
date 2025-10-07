import hre from 'hardhat';

/**
 * Remove Admin from SimpleMarketplace v2.1
 *
 * This script allows the current admin to remove an admin address.
 * Useful for testing or revoking admin access.
 *
 * USAGE:
 *   # Remove admin interactively (will prompt for address)
 *   HARDHAT_NETWORK=base-sepolia npm exec -- ts-node scripts/remove-admin.ts
 *
 *   # Remove admin with address argument
 *   HARDHAT_NETWORK=base-sepolia npm exec -- ts-node scripts/remove-admin.ts 0x1234567890123456789012345678901234567890
 *
 * PREREQUISITES:
 * - Marketplace v2.1 deployed
 * - You are an existing admin
 * - Target address is currently an admin
 *
 * WARNING: Cannot remove yourself as admin (contract restriction)
 */

async function main() {
  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  console.log('\n=== Remove Admin from SimpleMarketplace v2.1 ===');
  console.log('Current signer:', signer.address);

  // Get deployment config
  const network = process.env['HARDHAT_NETWORK'] || 'base-sepolia';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { deploymentConfig } = require(`../deployment-config.${network}`);

  // Get admin address to remove from command line args, env var, or prompt
  let adminToRemove = process.argv[2] || process.env['ADMIN_ADDRESS'];

  if (!adminToRemove) {
    // Prompt for address
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    adminToRemove = await new Promise<string>((resolve) => {
      rl.question('Enter admin address to remove (0x...): ', (answer: string) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  // Validate address format
  if (!hre.ethers.isAddress(adminToRemove)) {
    console.error('\n❌ ERROR: Invalid Ethereum address format');
    console.error('Address must be 42 characters starting with 0x');
    process.exit(1);
  }

  console.log('Admin to remove:', adminToRemove);

  // Check if trying to remove self
  if (adminToRemove.toLowerCase() === signer.address.toLowerCase()) {
    console.error('\n❌ ERROR: Cannot remove yourself as admin!');
    console.error('Use a different admin address to remove your admin status.');
    process.exit(1);
  }

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
    console.error('Only existing admins can remove other admins.');
    console.error('Current signer:', signer.address);
    process.exit(1);
  }
  console.log('✅ Current signer is an admin');

  // Check if target address is admin
  console.log('\nChecking target admin status...');
  const isTargetAdmin = await marketplace.admins(adminToRemove);
  if (!isTargetAdmin) {
    console.log('\n⚠️  WARNING: This address is not an admin!');
    console.log('Address:', adminToRemove);
    console.log('No action needed.');
    process.exit(0);
  }
  console.log('✅ Target address is an admin');

  // Confirm removal
  console.log('\n⚠️  CONFIRMATION REQUIRED');
  console.log('You are about to remove admin privileges from:');
  console.log('Address:', adminToRemove);

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const confirmed = await new Promise<boolean>((resolve) => {
    rl.question('Type "yes" to confirm: ', (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });

  if (!confirmed) {
    console.log('\n❌ Cancelled by user');
    process.exit(0);
  }

  // Remove admin
  console.log('\n🔄 Removing admin...');
  console.log('Transaction will be sent from:', signer.address);
  console.log('Removing admin:', adminToRemove);

  const tx = await marketplace.removeAdmin(adminToRemove);
  console.log('Transaction hash:', tx.hash);
  console.log('Waiting for confirmation...');

  const receipt = await tx.wait();
  console.log('✅ Transaction confirmed!');
  console.log('Block number:', receipt.blockNumber);
  console.log('Gas used:', receipt.gasUsed.toString());

  // Verify admin was removed
  console.log('\n🔍 Verifying admin status...');
  const isStillAdmin = await marketplace.admins(adminToRemove);
  if (!isStillAdmin) {
    console.log('✅ SUCCESS! Admin removed successfully');
    console.log('Address:', adminToRemove);
  } else {
    console.error('❌ ERROR: Failed to verify admin removal');
    console.error('Transaction succeeded but admin check failed');
    process.exit(1);
  }

  console.log('\n=== Admin Removed Successfully ===');
  console.log('This address can no longer:');
  console.log('- Add/remove products');
  console.log('- Add/remove admins');
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
