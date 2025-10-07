import { Wallet } from 'ethers';

async function main() {
  const wallet = Wallet.createRandom();

  console.log('\n=== New Deployer Wallet Generated ===');
  console.log('Address:', wallet.address);
  console.log('Private Key:', wallet.privateKey);
  console.log('\n⚠️  IMPORTANT: Save the private key securely!');
  console.log('1. Copy the private key above');
  console.log('2. Update blockchain/deployment-config.base-sepolia.js');
  console.log('3. Fund this address with Base Sepolia ETH');
  console.log('\nBase Sepolia Faucets:');
  console.log('- https://www.alchemy.com/faucets/base-sepolia');
  console.log('- https://docs.base.org/docs/tools/network-faucets');
  console.log('\n=====================================\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
