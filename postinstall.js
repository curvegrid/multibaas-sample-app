const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Wallet } = require('ethers');

// Global vars /////////////////////////

const CURVEGRID_PRIVATE_TESTNET_CHAIN_ID = 2017072401;

const CHAIN_ID_TO_RPC_URL = {
  42161:     "https://arbitrum.drpc.org",                   // Arbitrum One
  421614:    "https://arbitrum-sepolia.drpc.org",           // Arbitrum Sepolia

  10242:     "https://rpc.arthera.net",                     // Arthera Mainnet
  10243:     "https://rpc-test.arthera.net",                // Arthera Testnet

  43114:     "https://avalanche.drpc.org",                  // Avalanche Mainnet
  43113:     "https://avalanche-fuji.drpc.org",             // Avalanche Fuji

  56:        "https://bsc.drpc.org",                        // BNB Mainnet
  97:        "https://bsc-testnet.drpc.org",                // BNB Testnet

  8453:      "https://base.drpc.org",                       // Base Mainnet
  84532:     "https://base-sepolia.drpc.org",               // Base Sepolia

  42220:     "https://celo.drpc.org",                       // Celo Mainnet
  44787:     "https://celo-alfajores.drpc.org",             // Celo Alfajores

  1:         "https://mainnet.drpc.org",                    // Ethereum Mainnet
  11155111:  "https://sepolia.drpc.org",                    // Ethereum Sepolia
  17000:     "https://holesky.drpc.org",                    // Ethereum Holesky

  14:        "https://flare-api.flare.network/ext/C/rpc",   // Flare Mainnet
  114:       "https://coston2-api.flare.network/ext/C/rpc", // Flare Coston2

  100:       "https://gnosis.drpc.org",                     // Gnosis Mainnet

  5000:      "https://mantle.drpc.org",                     // Mantle Mainnet
  5003:      "https://mantle-sepolia.drpc.org",             // Mantle Sepolia

  245022934: "https://neon-evm.drpc.org",                   // Neon EVM Mainnet
  245022926: "https://neon-evm-devnet.drpc.org",            // Neon EVM Devnet

  10:        "https://optimism.drpc.org",                   // Optimism Mainnet
  11155420:  "https://optimism-sepolia.drpc.org",           // Optimism Sepolia

  137:       "https://polygon.drpc.org",                    // Polygon Mainnet
  80002:     "https://polygon-amoy.drpc.org",               // Polygon Amoy

  534352:    "https://scroll.drpc.org",                     // Scroll Mainnet
  534351:    "https://scroll-sepolia.drpc.org",             // Scroll Sepolia

  1440002:   "https://rpc.xrplevm.org",                     // XRPL EVM Devnet

  48900:     "https://zircuit-mainnet.drpc.org",            // Zircuit Mainnet
  48899:     "https://zircuit-testnet.drpc.org",            // Zircuit Testnet
};

const configFiles = [
  {
    source: 'blockchain/deployment-config.template.js',
    destination: 'blockchain/deployment-config.development.js',
  },
  {
    source: 'frontend/.env.template',
    destination: 'frontend/.env.development',
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


// Functions ///////////////////////////

async function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function copyFiles() {
  for (const { source, destination } of configFiles) {
    if (fs.existsSync(destination)) {
      const overwrite = await prompt(`⚠️  ${destination} already exists. Overwrite?`);
      if (!overwrite) {
        console.log(`❌ Skipped: ${destination}`);
        continue;
      }
    }
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied ${source} → ${destination}`);
  }
}

async function checkNetwork(config) {
  const apiEndpoint = `${config.deploymentURL}/api/v0/chains/ethereum/status`;

  try {
    const request = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.adminApiKey}`
      },
    };

    const response = await fetch(apiEndpoint, request);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    console.dir(data);
    return { chainID: data.result.chainID };

  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }

  return {};

}

async function createAPIKey(deploymentURL, apiKey, label, groupID) {
  const apiEndpoint = `${deploymentURL}/api/v0/api_keys`;
  const requestBody = {
    label: label,
    groupIDs: [groupID]
  };

  try {

    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(apiEndpoint, request);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    return data.result.key;
  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }

  return ''

}

async function callFaucet(deploymentURL, apiKey, address) {
  const apiEndpoint = `${deploymentURL}/api/v0/chains/ethereum/faucet`;

  const requestBody = {
    address: address
  };

  try {

    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(apiEndpoint, request);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    console.log('✅ Got money from faucet.');
    return {}
  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }

  return {}
}

async function setupCORS(deploymentURL, apiKey) {
  const apiEndpoint = `${deploymentURL}/api/v0/cors`;

  // Check if the origin "http://localhost:3000" is already there
  try {
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`❌ API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const corsOrigins = data.result.map(entry => entry.origin);
    if (corsOrigins.includes("http://localhost:3000")) {
      console.log(`✅ "http://localhost:3000" is already in the CORS list.`);
      return {};
    }
  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }


  // If no localhost:3000, add it
  const requestBody = {
    origin: 'http://localhost:3000'
  };

  try {
    const request = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    };

    const response = await fetch(apiEndpoint, request);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    console.log(`✅ "http://localhost:3000" added to CORS.`);
    return {}
  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }

  return {}
}

async function promptForDeploymentInfo() {

  // Abort if config files are missing
  for (const { destination } of configFiles) {
    if (!fs.existsSync(destination)) {
      console.log(`❌ Missing configuration file ${destination}`);
      return false;
    }
  }

  // Ask user for required information
  let deploymentURL = '';
  let url = '';
  for (;;) {
    deploymentURL = await askQuestion('Enter MultiBaas Deployment URL: ');
    try {
      url = new URL(deploymentURL);
    } catch (error) {
      console.error(error.message);
      console.log('URL should be of the format https://<DEPLOYMENT ID>.multibaas.com\n');
      continue;
    }
    break;
  }
  deploymentURL = `${url.protocol}//${url.hostname}`; // Keep only protocol + domain

  let adminApiKey = await askQuestion('Enter MultiBaas Admin API Key: ');
  adminApiKey = adminApiKey.replace(/[\r\n\s]+/g, ''); // Remove newlines and spaces

  let reownProjectId = await askQuestion('Enter Reown WalletKit project ID: ');
  reownProjectId = reownProjectId.replace(/[\r\n\s]+/g, ''); // Remove newlines and spaces

  console.log('');

  return { deploymentURL, adminApiKey, reownProjectId };

}

async function provisionApiKeys(config) {
  // Timestamp
  const date = new Date();
  const dateString = new Date().toISOString().replace(/[^\d]/g, '');

  // Create Web3 API Key
  const WEB_3_GROUP_ID = 6;
  const web3KeyLabel = `web3key_${dateString}`;

  let web3Key = await createAPIKey(config.deploymentURL, config.adminApiKey, web3KeyLabel, WEB_3_GROUP_ID);
  if (web3Key === '') {
    console.error('Aborting configuration');
    exit(1);
  } else {
    console.log('✅ Created Web3 API Key:', web3Key);
  }

  // Create DApp User API Key
  const DAPP_USER_GROUP_ID = 5;
  const dappUserKeyLabel = `dapp_user_key_${dateString}`;

  let dappUserKey = await createAPIKey(config.deploymentURL, config.adminApiKey, dappUserKeyLabel, DAPP_USER_GROUP_ID);
  if (dappUserKey !== '') {
    console.log('✅ Created Dapp User API Key:', dappUserKey);
  }

  return { web3Key, dappUserKey };
}


async function writeConfiguration(config) {

  // Update blockchain config file
  const blockchainConfigPath = configFiles[0].destination;
  let blockchainConfig = fs.readFileSync(blockchainConfigPath, 'utf8');
  blockchainConfig = blockchainConfig.replace(/deploymentEndpoint:.*/, `deploymentEndpoint: '${config.deploymentURL}',`);
  blockchainConfig = blockchainConfig.replace(/adminApiKey:.*/, `adminApiKey:\n    '${config.adminApiKey}',`);
  if (config.chainID === CURVEGRID_PRIVATE_TESTNET_CHAIN_ID) {
    blockchainConfig = blockchainConfig.replace(/web3Key:.*/, `web3Key:\n    '${config.web3Key}',`);
  } else {
    blockchainConfig = blockchainConfig.replace(/web3Key:.*/, `// web3Key:`);
    blockchainConfig = blockchainConfig.replace(/rpcUrl:.*/, `rpcUrl: '${CHAIN_ID_TO_RPC_URL[config.chainID]}',`);
  }
  blockchainConfig = blockchainConfig.replace(/deployerPrivateKey:.*/, `deployerPrivateKey: '${config.wallet.privateKey}',`);
  fs.writeFileSync(blockchainConfigPath, blockchainConfig, 'utf8');
  console.log(`✅ Updated ${blockchainConfigPath}.`);


  // Update frontend config file
  const frontendConfigPath = configFiles[1].destination;
  let frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL=.*/, `NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL='${config.deploymentURL}'`);
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY=.*/, `NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY='${config.web3Key}'`);
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY=.*/, `NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY='${config.dappUserKey}'`);
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID=.*/, `NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID='${config.reownProjectId}'`);
  fs.writeFileSync(frontendConfigPath, frontendConfig, 'utf8');
  console.log(`✅ Updated ${frontendConfigPath}.`);

}

async function setupPrivateDeployerKey(config) {
  const wallet = Wallet.createRandom();
  console.log('✅ Generated Ethereum Wallet:')
  console.log(`   Address: ${wallet.address}`);
  console.log(`   Private Key: ${wallet.privateKey}`);

  if (config.chainID === CURVEGRID_PRIVATE_TESTNET_CHAIN_ID) {
    console.log('  Detected Curvegrid Private Testnet, asking faucet for money...');
    await callFaucet(config.deploymentURL, config.adminApiKey, wallet.address);
  } else {
    console.log('💸 YOU WILL HAVE TO FUND THIS ACCOUNT TO USE IT AS A DEPLOYER.');
  }

  return { wallet };
}

async function runConfig() {
  // Main script

  console.log("\n#### Begin Post-Installation ####\n");
  console.log("\nYou will need:\n");
  console.log("1. A MultiBaas deployment URL");
  console.log("2. A MultiBaas Admin API key for the deployment");
  console.log("3. A Reown WalletKit project ID");

  proceed = await prompt("\nNOTE: You can re-run this configuration script any time with 'npm run postinstall'\n\nContinue?");

  if (!proceed) {
    console.log('Skipping post-installation\n');
    rl.close();
    return;
  }

  console.log("🚀 Copying configuration files...\n");
  await copyFiles();

  console.log('\n🔧 MultiBaas Configuration...\n');
  let config = {};
  config = { ...config, ... await promptForDeploymentInfo() };
  config = { ...config, ... await provisionApiKeys(config) };
  config = { ...config, ... await checkNetwork(config) };
  config = { ...config, ... await setupPrivateDeployerKey(config) };
  await setupCORS(config.deploymentURL, config.adminApiKey);

  writeConfiguration(config);


  console.log('\n#### Configuration complete 🦦 ####\n\n');


  console.log('To deploy the voting contract:');

  console.log('cd blockchain');
  console.log('npm run deploy:voting:dev');


  console.log('\nTo run the frontend server after deploying the contract:');

  console.log('cd frontend');
  console.log('npm run dev');

  console.log();

  rl.close();
}

runConfig();
