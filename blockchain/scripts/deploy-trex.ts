import hre from 'hardhat';
import { ContractTransactionResponse } from 'ethers';

async function main() {
  const signers = await hre.ethers.getSigners();
  const signer = signers[0];

  await hre.mbDeployer.setup();

  console.log('Deploying T-REX ERC-3643 token suite with MultiBaas integration...');
  console.log('Deployer account:', signer.address);

  // Deploy ClaimTopicsRegistry using MultiBaas
  console.log('Deploying ClaimTopicsRegistry...');
  const claimTopicsRegistry = await hre.mbDeployer.deploy(signer, 'ClaimTopicsRegistry', [], {
    addressAlias: 'claim_topics_registry',
    contractVersion: '4.1.6',
    contractLabel: 'claim_topics_registry',
  });
  console.log(`ClaimTopicsRegistry deployed to ${await claimTopicsRegistry.contract.getAddress()}`);

  // Deploy TrustedIssuersRegistry
  console.log('Deploying TrustedIssuersRegistry...');
  const trustedIssuersRegistry = await hre.mbDeployer.deploy(signer, 'TrustedIssuersRegistry', [], {
    addressAlias: 'trusted_issuers_registry',
    contractVersion: '4.1.6',
    contractLabel: 'trusted_issuers_registry',
  });
  console.log(`TrustedIssuersRegistry deployed to ${await trustedIssuersRegistry.contract.getAddress()}`);

  // Deploy IdentityRegistryStorage
  console.log('Deploying IdentityRegistryStorage...');
  const identityRegistryStorage = await hre.mbDeployer.deploy(signer, 'IdentityRegistryStorage', [], {
    addressAlias: 'identity_registry_storage',
    contractVersion: '4.1.6',
    contractLabel: 'identity_registry_storage',
  });
  console.log(`IdentityRegistryStorage deployed to ${await identityRegistryStorage.contract.getAddress()}`);

  // Deploy IdentityRegistry
  console.log('Deploying IdentityRegistry...');
  const identityRegistry = await hre.mbDeployer.deploy(signer, 'IdentityRegistry', [], {
    addressAlias: 'identity_registry',
    contractVersion: '4.1.6',
    contractLabel: 'identity_registry',
  });
  console.log(`IdentityRegistry deployed to ${await identityRegistry.contract.getAddress()}`);

  // Deploy ModularCompliance
  console.log('Deploying ModularCompliance...');
  const modularCompliance = await hre.mbDeployer.deploy(signer, 'ModularCompliance', [], {
    addressAlias: 'modular_compliance',
    contractVersion: '4.1.6',
    contractLabel: 'modular_compliance',
  });
  console.log(`ModularCompliance deployed to ${await modularCompliance.contract.getAddress()}`);

  // Deploy Token
  console.log('Deploying T-REX Token...');
  const token = await hre.mbDeployer.deploy(signer, 'Token', [], {
    addressAlias: 'trex_token',
    contractVersion: '4.1.6',
    contractLabel: 'trex_token',
  });
  console.log(`T-REX Token deployed to ${await token.contract.getAddress()}`);

  // Initialize contracts with proper parameters
  console.log('\nInitializing contracts...');

  // Initialize ClaimTopicsRegistry
  console.log('Initializing ClaimTopicsRegistry...');
  await claimTopicsRegistry.contract.init();

  // Initialize TrustedIssuersRegistry
  console.log('Initializing TrustedIssuersRegistry...');
  await trustedIssuersRegistry.contract.init();

  // Initialize IdentityRegistryStorage
  console.log('Initializing IdentityRegistryStorage...');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const initTx = await identityRegistryStorage.contract.init();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await initTx.wait();
  console.log('IdentityRegistryStorage initialized, checking owner...');
  try {
    const owner = (await identityRegistryStorage.contract.owner()) as string;
    console.log('IdentityRegistryStorage owner after init:', owner);
  } catch (e) {
    console.log('Could not check owner after init:', (e as Error).message);
  }

  // Initialize IdentityRegistry with required registries
  console.log('Initializing IdentityRegistry...');
  await identityRegistry.contract.init(
    await trustedIssuersRegistry.contract.getAddress(),
    await claimTopicsRegistry.contract.getAddress(),
    await identityRegistryStorage.contract.getAddress(),
  );

  // Initialize ModularCompliance
  console.log('Initializing ModularCompliance...');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const complianceInitTx = await modularCompliance.contract.init();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await complianceInitTx.wait();
  console.log('ModularCompliance initialized, checking owner...');
  try {
    const complianceOwner = (await modularCompliance.contract.owner()) as string;
    console.log('ModularCompliance owner after init:', complianceOwner);
  } catch (e) {
    console.log('Could not check ModularCompliance owner after init:', (e as Error).message);
  }

  // Initialize T-REX Token with all required parameters
  console.log('Initializing T-REX Token...');
  await token.contract.init(
    await identityRegistry.contract.getAddress(),
    await modularCompliance.contract.getAddress(),
    'T-REX Security Token',
    'TREX',
    18,
    '0x0000000000000000000000000000000000000000', // onchainID - can be set later by owner
  );

  // Set up contract relationships
  console.log('Setting up contract relationships...');
  console.log('Current signer:', signer.address);
  console.log('IdentityRegistryStorage address:', await identityRegistryStorage.contract.getAddress());

  // Check owner of the storage contract
  try {
    const owner = (await identityRegistryStorage.contract.owner()) as string;
    console.log('IdentityRegistryStorage owner:', owner);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error(`ERROR: Contract owner (${owner}) does not match deployer (${signer.address})`);
      throw new Error('Contract ownership mismatch');
    }
  } catch (e) {
    console.log('Could not check owner:', (e as Error).message);
  }

  await identityRegistryStorage.contract.bindIdentityRegistry(await identityRegistry.contract.getAddress());

  // Check ModularCompliance owner before binding
  try {
    const complianceOwner = (await modularCompliance.contract.owner()) as string;
    console.log('ModularCompliance owner before bindToken:', complianceOwner);
    if (complianceOwner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error(`ERROR: ModularCompliance owner (${complianceOwner}) does not match deployer (${signer.address})`);
      throw new Error('ModularCompliance ownership mismatch');
    }
  } catch (e) {
    console.log('Could not check ModularCompliance owner:', (e as Error).message);
  }

  await modularCompliance.contract.bindToken(await token.contract.getAddress());

  // Deploy SynthIdentity System
  console.log('\n=== Deploying SynthIdentity System ===');

  // const userWallet = signers[1] || signer; // Use second signer as user, fallback to deployer
  const userWallet = { address: '0xf7910724522E1DB0e4D7Ab2F111323cA2679D1c9' };
  const CLAIM_TOPIC = 100100; // KYC verification topic
  const COUNTRY_CODE = 392; // Japan

  // Deploy SynthClaimIssuer first
  console.log('Deploying SynthClaimIssuer...');
  const claimIssuerContract = await hre.mbDeployer.deploy(signer, 'SynthClaimIssuer', [], {
    addressAlias: 'synth_claim_issuer',
    contractVersion: '1.0',
    contractLabel: 'synth_claim_issuer',
  });
  console.log(`SynthClaimIssuer deployed to: ${await claimIssuerContract.contract.getAddress()}`);

  // Deploy SBT Compliance Module
  console.log('\n=== Deploying SBT Compliance Module ===');

  // We'll deploy the SBT first, then the compliance module

  // Deploy Sample SBT for testing
  console.log('Deploying Sample SBT...');
  const sbtContract = await hre.mbDeployer.deploy(signer, 'SampleSBT', ['Verification SBT', 'VSBT'], {
    addressAlias: 'sample_sbt',
    contractVersion: '1.0',
    contractLabel: 'sample_sbt',
  });
  console.log(`Sample SBT deployed to: ${await sbtContract.contract.getAddress()}`);

  // Mint SBT to user wallet
  console.log('Minting SBT to user wallet...');
  await sbtContract.contract.mintSBT(userWallet.address);
  console.log(`SBT minted to ${userWallet.address}`);

  // Deploy SBTComplianceModule
  console.log('Deploying SBTComplianceModule...');
  const sbtComplianceModule = await hre.mbDeployer.deploy(
    signer,
    'SBTComplianceModule',
    [await sbtContract.contract.getAddress()],
    {
      addressAlias: 'sbt_compliance_module',
      contractVersion: '1.0',
      contractLabel: 'sbt_compliance_module',
    },
  );
  console.log(`SBTComplianceModule deployed to: ${await sbtComplianceModule.contract.getAddress()}`);

  // Add SBTComplianceModule to ModularCompliance
  console.log('Adding SBTComplianceModule to ModularCompliance...');
  await modularCompliance.contract.addModule(await sbtComplianceModule.contract.getAddress());
  console.log('SBTComplianceModule added to ModularCompliance');

  // Deploy SynthIdentity
  console.log('Deploying SynthIdentity...');
  const synthIdentityContract = await hre.mbDeployer.deploy(
    signer,
    'SynthIdentity',
    [
      userWallet.address, // controller
      await sbtContract.contract.getAddress(), // sbt contract
      CLAIM_TOPIC, // topic
      await claimIssuerContract.contract.getAddress(), // virtual issuer (now proper contract)
      'https://example.com/kyc-verification', // uri
    ],
    {
      addressAlias: 'synth_identity',
      contractVersion: '1.0',
      contractLabel: 'synth_identity',
    },
  );
  console.log(`SynthIdentity deployed to: ${await synthIdentityContract.contract.getAddress()}`);

  // Authorize SynthIdentity in the claim issuer
  console.log('Authorizing SynthIdentity in claim issuer...');
  await claimIssuerContract.contract.authorizeIdentity(await synthIdentityContract.contract.getAddress());

  // Configure T-REX registries for SynthIdentity
  console.log('Configuring T-REX registries for SynthIdentity...');

  // Add claim topic to ClaimTopicsRegistry
  console.log(`Adding claim topic ${CLAIM_TOPIC}...`);
  await claimTopicsRegistry.contract.addClaimTopic(CLAIM_TOPIC);

  // Add claim issuer to TrustedIssuersRegistry
  const claimIssuerAddress = await claimIssuerContract.contract.getAddress();
  console.log(`Adding claim issuer ${claimIssuerAddress}...`);
  await trustedIssuersRegistry.contract.addTrustedIssuer(claimIssuerAddress, [CLAIM_TOPIC]);

  // Add deployer as agent to IdentityRegistry (needed to register identities)
  console.log(`Adding deployer as agent to IdentityRegistry...`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const addAgentTx = await identityRegistry.contract.addAgent(signer.address);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  await addAgentTx.wait();

  // Verify agent was added
  try {
    const isAgent = (await identityRegistry.contract.isAgent(signer.address)) as boolean;
    console.log(`Is deployer an agent? ${isAgent}`);
    if (!isAgent) {
      throw new Error('Failed to add deployer as agent');
    }
  } catch (e) {
    console.log('Could not verify agent status:', (e as Error).message);
  }

  // Register user identity with SynthIdentity
  console.log(`Registering user identity for ${userWallet.address}...`);
  try {
    const registerTx = (await identityRegistry.contract.registerIdentity(
      userWallet.address,
      await synthIdentityContract.contract.getAddress(),
      COUNTRY_CODE,
    )) as ContractTransactionResponse;
    await registerTx.wait();
    console.log('✅ User identity registration successful');

    // Verify registration worked
    const registeredIdentity = (await identityRegistry.contract.identity(userWallet.address)) as string;
    console.log(`Registered identity address: ${registeredIdentity}`);

    if (registeredIdentity === '0x0000000000000000000000000000000000000000') {
      throw new Error('Identity registration failed - no identity found after registration');
    }
  } catch (e) {
    console.error('❌ Identity registration failed:', (e as Error).message);
    throw e;
  }

  // Test the SynthIdentity system
  console.log('\n=== Testing SynthIdentity System ===');

  const isValid = (await synthIdentityContract.contract.isValid()) as boolean;
  console.log(`SynthIdentity is valid: ${isValid}`);

  const sbtBalance = (await sbtContract.contract.balanceOf(userWallet.address)) as bigint;
  console.log(`User SBT balance: ${sbtBalance}`);

  // Test SynthIdentity claim methods first
  console.log('Testing SynthIdentity claim methods...');
  const claimIds = (await synthIdentityContract.contract.getClaimIdsByTopic(CLAIM_TOPIC)) as string[];
  console.log(`Claim IDs for topic ${CLAIM_TOPIC}:`, claimIds);

  if (claimIds.length > 0) {
    const claim = (await synthIdentityContract.contract.getClaim(claimIds[0])) as {
      _topic: bigint;
      scheme: bigint;
      issuer: string;
      signature: string;
      data: string;
      _uri: string;
    };
    console.log(`Claim details:`, {
      topic: claim._topic.toString(),
      scheme: claim.scheme.toString(),
      issuer: claim.issuer,
      uri: claim._uri,
    });
  }

  // Check if user is registered
  const identityContract = (await identityRegistry.contract.identity(userWallet.address)) as string;
  console.log(`User identity contract: ${identityContract}`);

  // Detailed debugging of isVerified process
  console.log('\n=== Debugging isVerified Step by Step ===');

  let isVerified = false;
  try {
    // Step 1: Check if identity exists
    console.log(`Checking for identity with wallet: ${userWallet.address}`);
    const userIdentityAddress = (await identityRegistry.contract.identity(userWallet.address)) as string;
    console.log(`1. User identity contract address: ${userIdentityAddress}`);

    if (userIdentityAddress === '0x0000000000000000000000000000000000000000') {
      console.log('❌ No identity registered for user');
      return;
    }

    // Step 2: Get required claim topics
    const requiredClaimTopics = (await claimTopicsRegistry.contract.getClaimTopics()) as bigint[];
    console.log(`2. Required claim topics: [${requiredClaimTopics.map((t) => t.toString()).join(', ')}]`);

    if (requiredClaimTopics.length === 0) {
      console.log('✅ No required claim topics - user should be verified');
    }

    // Step 3: For each required topic, check trusted issuers
    for (let i = 0; i < requiredClaimTopics.length; i++) {
      const topic = requiredClaimTopics[i];
      console.log(`\n--- Processing topic ${topic} ---`);

      const trustedIssuers = (await trustedIssuersRegistry.contract.getTrustedIssuersForClaimTopic(topic)) as string[];
      console.log(`3.${i + 1}. Trusted issuers for topic ${topic}: [${trustedIssuers.join(', ')}]`);

      if (trustedIssuers.length === 0) {
        console.log(`❌ No trusted issuers for topic ${topic}`);
        continue;
      }

      // Step 4: Generate claim IDs that T-REX expects
      for (let j = 0; j < trustedIssuers.length; j++) {
        const issuer = trustedIssuers[j];
        const expectedClaimId = hre.ethers.keccak256(
          hre.ethers.AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [issuer, topic]),
        );
        console.log(`4.${j + 1}. Expected claim ID for issuer ${issuer}: ${expectedClaimId}`);

        // Step 5: Try to get claim from SynthIdentity
        try {
          const claim = (await synthIdentityContract.contract.getClaim(expectedClaimId)) as {
            _topic: bigint;
            scheme: bigint;
            issuer: string;
            signature: string;
            data: string;
            _uri: string;
          };
          console.log(`5.${j + 1}. Claim from SynthIdentity:`, {
            topic: claim._topic.toString(),
            scheme: claim.scheme.toString(),
            issuer: claim.issuer,
            hasSignature: claim.signature.length > 0,
            hasData: claim.data.length > 0,
            uri: claim._uri,
          });

          // Check if this claim matches what T-REX expects
          const claimTopic = Number(claim._topic);
          if (claimTopic === Number(topic)) {
            console.log(`✅ Found matching claim for topic ${topic} from issuer ${issuer}`);
          } else {
            console.log(`❌ Claim topic ${claimTopic} doesn't match required topic ${topic}`);
          }
        } catch (claimError: unknown) {
          const error = claimError as Error;
          console.log(`❌ Failed to get claim ${expectedClaimId}:`, error.message);
        }
      }
    }

    // Step 6: Finally try isVerified
    console.log('\n6. Calling isVerified...');
    isVerified = (await identityRegistry.contract.isVerified(userWallet.address)) as boolean;
    console.log(`✅ User ${userWallet.address} is verified: ${isVerified}`);
  } catch (error: unknown) {
    const mainError = error as Error;
    console.log(`❌ isVerified process failed:`, mainError.message);

    // Additional debug info
    try {
      const hasValidIdentity = (await identityRegistry.contract.contains(userWallet.address)) as boolean;
      console.log(`Debug: User has valid identity in registry: ${hasValidIdentity}`);
    } catch (debugError: unknown) {
      const dbgError = debugError as Error;
      console.log(`Debug: Registry contains check failed:`, dbgError.message);
    }

    // Try to understand the exact error
    if (mainError.message.includes('execution reverted')) {
      console.log('This suggests the contract call failed during execution, likely due to:');
      console.log('1. Invalid claim data structure');
      console.log('2. Missing required claim for verification');
      console.log('3. Issue with isClaimValid call to trusted issuer');
    }
  }

  console.log('\n=== T-REX Suite with SynthIdentity Deployment Complete ===');
  console.log('ClaimTopicsRegistry:', await claimTopicsRegistry.contract.getAddress());
  console.log('TrustedIssuersRegistry:', await trustedIssuersRegistry.contract.getAddress());
  console.log('IdentityRegistryStorage:', await identityRegistryStorage.contract.getAddress());
  console.log('IdentityRegistry:', await identityRegistry.contract.getAddress());
  console.log('ModularCompliance:', await modularCompliance.contract.getAddress());
  console.log('T-REX Token:', await token.contract.getAddress());
  console.log('Sample SBT:', await sbtContract.contract.getAddress());
  console.log('SynthIdentity:', await synthIdentityContract.contract.getAddress());
  console.log('SynthClaimIssuer:', await claimIssuerContract.contract.getAddress());

  if (isVerified) {
    console.log('\n✅ SUCCESS: SynthIdentity system is working.');
    console.log(`User ${userWallet.address} can now interact with T-REX tokens as a verified identity.`);
  } else {
    console.log('\n❌ ISSUE: Identity verification failed. Check configuration.');
  }

  console.log('\n=== MultiBaas Integration ===');
  console.log('All contracts are registered with MultiBaas and ready for use!');
  console.log('Access them through the MultiBaas web interface.');
}

// Error handling and logging
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
