import { ethers } from 'ethers';

// Get arguments from command line
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npm run calc-claim-id <issuer_address> <claim_topic>');
  console.log('Example: npm run calc-claim-id 0x1D27263Eb215711c0197d0DCe7Dcc8a7749aCA45 100100');
  process.exit(1);
}

const issuerAddress = args[0];
const claimTopic = parseInt(args[1]);

console.log('🔍 Calculating Claim ID');
console.log('Issuer Address:', issuerAddress);
console.log('Claim Topic:', claimTopic);
console.log('');

// Calculate the hash - same as: keccak256(abi.encode(issuer, topic))
const encoded = ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [issuerAddress, claimTopic]);

const claimId = ethers.keccak256(encoded);

console.log('📊 Results:');
console.log('Encoded data:', encoded);
console.log('Claim ID (hash):', claimId);
console.log('');
console.log('✅ You can use this Claim ID in your smart contract calls!');
