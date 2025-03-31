const fs = require('fs');
const readline = require('readline');
const { Wallet } = require('ethers');

// Global vars /////////////////////////

const CURVEGRID_PRIVATE_TESTNET_CHAIN_ID = 2017072401;

// Ripped from wagmi/chains with a couple of manual additions
const CHAIN_ID_TO_RPC = {
  1: {
    url: "https://eth.merkle.io",
    name: "Ethereum"
  },
  10: {
    url: "https://mainnet.optimism.io",
    name: "OP Mainnet"
  },
  14: {
    url: "https://flare-api.flare.network/ext/C/rpc",
    name: "Flare Mainnet"
  },
  56: {
    url: "https://rpc.ankr.com/bsc",
    name: "BNB Smart Chain"
  },
  97: {
    url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    name: "Binance Smart Chain Testnet"
  },
  100: {
    url: "https://rpc.gnosischain.com",
    name: "Gnosis"
  },
  114: {
    url: "https://coston2-api.flare.network/ext/C/rpc",
    name: "Flare Testnet Coston2"
  },
  137: {
    url: "https://polygon-rpc.com",
    name: "Polygon"
  },
  5000: {
    url: "https://rpc.mantle.xyz",
    name: "Mantle"
  },
  5001: {
    url: "https://rpc.testnet.mantle.xyz",
    name: "Mantle Testnet"
  },
  8453: {
    url: "https://mainnet.base.org",
    name: "Base"
  },
  10242: {
    url: "https://rpc.arthera.net",
    name: "Arthera"
  },
  10243: {
    url: "https://rpc-test.arthera.net",
    name: "Arthera Testnet"
  },
  17000: {
    url: "https://ethereum-holesky-rpc.publicnode.com",
    name: "Holesky"
  },
  42161: {
    url: "https://arb1.arbitrum.io/rpc",
    name: "Arbitrum One"
  },
  42220: {
    url: "https://forno.celo.org",
    name: "Celo"
  },
  43113: {
    url: "https://api.avax-test.network/ext/bc/C/rpc",
    name: "Avalanche Fuji"
  },
  43114: {
    url: "https://api.avax.network/ext/bc/C/rpc",
    name: "Avalanche"
  },
  44787: {
    url: "https://alfajores-forno.celo-testnet.org",
    name: "Alfajores"
  },
  48899: {
    url: "https://zircuit1-testnet.p2pify.com",
    name: "Zircuit Testnet"
  },
  48900: {
    url: "https://zircuit1-mainnet.p2pify.com",
    name: "Zircuit Mainnet"
  },
  80002: {
    url: "https://rpc-amoy.polygon.technology",
    name: "Polygon Amoy"
  },
  84532: {
    url: "https://sepolia.base.org",
    name: "Base Sepolia"
  },
  421614: {
    url: "https://sepolia-rollup.arbitrum.io/rpc",
    name: "Arbitrum Sepolia"
  },
  534351: {
    url: "https://sepolia-rpc.scroll.io",
    name: "Scroll Sepolia"
  },
  534352: {
    url: "https://rpc.scroll.io",
    name: "Scroll"
  },
  1440002: {
    url: "https://rpc.xrplevm.org",
    name: "XRPL EVM Devnet"
  },
  11155111: {
    url: "https://sepolia.drpc.org",
    name: "Sepolia"
  },
  11155420: {
    url: "https://sepolia.optimism.io",
    name: "OP Sepolia"
  },
  245022926: {
    url: "https://devnet.neonevm.org",
    name: "Neon EVM DevNet"
  },
  245022934: {
    url: "https://neon-proxy-mainnet.solana.p2p.org",
    name: "Neon EVM MainNet"
  },

  // Manual additions
  10242: {
    url: "https://rpc.arthera.net",
    name: 'Arthera',
  },
  10243: {
    url: "https://rpc-test.arthera.net",
    name: "Arthera Testnet",
 },
  1440002: {
    url: "https://rpc.xrplevm.org",
    name: "XRPL EVM Devnet",
 }

}


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
    // console.dir(data);
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
    console.error(error.stack);
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

    await response.json();
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

  const web3Key = await createAPIKey(config.deploymentURL, config.adminApiKey, web3KeyLabel, WEB_3_GROUP_ID);
  if (web3Key === '') {
    console.error('Aborting configuration');
    process.exit(1);
  } else {
    console.log('✅ Created Web3 API Key:', web3Key);
  }

  // Create DApp User API Key
  const DAPP_USER_GROUP_ID = 5;
  const dappUserKeyLabel = `dapp_user_key_${dateString}`;

  const dappUserKey = await createAPIKey(config.deploymentURL, config.adminApiKey, dappUserKeyLabel, DAPP_USER_GROUP_ID);
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
    blockchainConfig = blockchainConfig.replace(/rpcUrl:.*/, `rpcUrl: '${CHAIN_ID_TO_RPC[config.chainID].url}',`);
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
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_CHAIN_ID=.*/, `NEXT_PUBLIC_MULTIBAAS_CHAIN_ID='${config.chainID}'`);
  fs.writeFileSync(frontendConfigPath, frontendConfig, 'utf8');
  console.log(`✅ Updated ${frontendConfigPath}.`);

}

async function setupPrivateDeployerKey(config) {
  const wallet = Wallet.createRandom();
  console.log('✅ Generated Ethereum Wallet (Feel free to replace with your own):')
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
