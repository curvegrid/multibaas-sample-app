import hre from 'hardhat';

/**
 * Cleanup unaliased addresses from MultiBaas
 *
 * PROBLEM: MultiBaas automatically creates address entries when:
 * - Frontend makes calls with contractOverride: true and from: address
 * - Contracts interact with external addresses
 * - RainbowKit/wagmi queries blockchain through MultiBaas
 *
 * This script lists all unaliased addresses and allows deletion.
 *
 * RUN WITH:
 *   npm run cleanup:addresses
 *
 * EDUCATIONAL: After fixing frontend to not send 'from' on view calls,
 * you may want to clean up existing unaliased addresses.
 */

async function main() {
  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  console.log('\n=== MultiBaas Address Cleanup ===');
  console.log('Signer:', signer.address);

  // Get deployment config for API key
  const network = process.env['HARDHAT_NETWORK'] || 'base-sepolia';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const deploymentModule = require(`../deployment-config.${network}`) as {
    deploymentConfig: { deploymentEndpoint: string; adminApiKey: string };
  };

  const mbUrl = deploymentModule.deploymentConfig.deploymentEndpoint;
  const apiKey = deploymentModule.deploymentConfig.adminApiKey;

  console.log('MultiBaas URL:', mbUrl);

  // Fetch all addresses
  const response = await fetch(`${mbUrl}/api/v0/chains/ethereum/addresses`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  interface AddressResult {
    status: number;
    message: string;
    result: Array<{ alias: string; address: string }>;
  }

  const data = (await response.json()) as AddressResult;
  const addresses = data.result;

  // Separate aliased and unaliased
  const aliased = addresses.filter((a) => a.alias !== '');
  const unaliased = addresses.filter((a) => a.alias === '');

  console.log('\n=== Address Summary ===');
  console.log(`Total addresses: ${addresses.length}`);
  console.log(`Aliased: ${aliased.length}`);
  console.log(`Unaliased: ${unaliased.length}`);

  // Show aliased addresses
  console.log('\n=== Aliased Addresses (keep these) ===');
  aliased.forEach((a) => {
    console.log(`  ${a.alias.padEnd(30)} → ${a.address}`);
  });

  // Show unaliased addresses
  console.log('\n=== Unaliased Addresses ===');
  if (unaliased.length === 0) {
    console.log('  (none)');
  } else {
    unaliased.forEach((a, i) => {
      console.log(`  ${(i + 1).toString().padStart(3)}. ${a.address}`);
    });
  }

  // Prompt for cleanup
  if (unaliased.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const readline = require('readline') as {
      createInterface: (opts: { input: NodeJS.ReadStream; output: NodeJS.WriteStream }) => {
        question: (query: string, callback: (answer: string) => void) => void;
        close: () => void;
      };
    };

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const shouldCleanup = await new Promise<string>((resolve) => {
      rl.question(`\n🗑️  Delete all ${unaliased.length} unaliased addresses? (yes/no): `, (answer: string) => {
        rl.close();
        resolve(answer.trim().toLowerCase());
      });
    });

    if (shouldCleanup === 'yes' || shouldCleanup === 'y') {
      console.log('\n=== Deleting Unaliased Addresses ===');
      let deleted = 0;
      let failed = 0;

      for (const addr of unaliased) {
        try {
          const deleteResponse = await fetch(`${mbUrl}/api/v0/chains/ethereum/addresses/${addr.address}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (deleteResponse.ok) {
            deleted++;
            console.log(`  ✅ Deleted ${addr.address}`);
          } else {
            failed++;
            console.error(`  ❌ Failed to delete ${addr.address}`);
          }
        } catch (err) {
          failed++;
          console.error(`  ❌ Error deleting ${addr.address}:`, err);
        }
      }

      console.log('\n=== Cleanup Complete ===');
      console.log(`Deleted: ${deleted}`);
      console.log(`Failed: ${failed}`);
    } else {
      console.log('\n❌ Cleanup cancelled');
    }
  }

  console.log('\n=== Why are unaliased addresses created? ===');
  console.log('MultiBaas creates address entries when:');
  console.log('1. Frontend uses contractOverride: true with from: address');
  console.log('2. Contracts emit events with address parameters');
  console.log('3. External contracts are called during transactions');
  console.log('');
  console.log('Common unaliased addresses:');
  console.log('  - User wallet addresses (from frontend)');
  console.log('  - EntryPoint (0x5FF...2789) - ERC-4337 account abstraction');
  console.log('  - Multicall3 (0xcA1...CA11) - batch calls');
  console.log('  - System contracts from Base infrastructure');
  console.log('');
  console.log('To reduce unaliased addresses:');
  console.log('  - Remove contractOverride: true from view-only calls');
  console.log('  - Only use from: address for transaction signing');
  console.log('=====================================\n');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
