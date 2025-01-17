import { ethers } from 'hardhat';

async function main() {
  const numberOfOptions = 2;

  const simpleVoting = await ethers.deployContract('SimpleVoting', [numberOfOptions]);

  await simpleVoting.waitForDeployment();

  console.log(`SimpleVoting with ${numberOfOptions} options deployed to ${await simpleVoting.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
