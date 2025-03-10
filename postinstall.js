const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { Wallet } = require('ethers');

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

// Function to prompt user for overwrite confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function promptOverwrite(destination) {
  return new Promise((resolve) => {
    rl.question(`⚠️  ${destination} already exists. Overwrite? (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function copyFiles() {
  for (const { source, destination } of configFiles) {
    if (fs.existsSync(destination)) {
      const overwrite = await promptOverwrite(destination);
      if (!overwrite) {
        console.log(`❌ Skipped: ${destination}`);
        continue;
      }
    }
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied ${source} → ${destination}`);
  }
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
      throw new Error(`❌ API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    // console.log('data', data);
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
      throw new Error(`❌ API request failed with status ${response.status} - ${response.statusText} - \nFull request:\n${JSON.stringify(request)}\nFull response:\n${JSON.stringify(response)}`);
    }

    const data = await response.json();
    console.log('data', data);
    return {}
  } catch (error) {
    console.error(`❌ API Request Error: ${error.message}`);
  }

  return {}
}

async function promptForDeploymentInfo() {

  // Prompt for config only if files exist
  for (const { destination } of configFiles) {
    if (!fs.existsSync(destination)) {
      console.log(`❌ Missing configuration file ${destination}`);
      return false;
    }
  }

  // Ask user for required information
  let deploymentURL = await askQuestion('Enter MultiBaas Deployment URL: ');
  let url = new URL(deploymentURL);
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
  console.log('✅ Created Web3 API Key: ', web3Key);

  // Create DApp User API Key
  const DAPP_USER_GROUP_ID = 5;
  const dappUserKeyLabel = `dapp_user_key_${dateString}`;

  let dappUserKey = await createAPIKey(config.deploymentURL, config.adminApiKey, dappUserKeyLabel, DAPP_USER_GROUP_ID);
  console.log('✅ Created Dapp User API Key: ', dappUserKey);

  return { web3Key, dappUserKey };
}


async function writeConfiguration(config) {

  // Update blockchain config file
  const blockchainConfigPath = configFiles[0].destination;
  let blockchainConfig = fs.readFileSync(blockchainConfigPath, 'utf8');
  blockchainConfig = blockchainConfig.replace(/deploymentEndpoint:.*/, `deploymentEndpoint: '${config.deploymentURL}',`);
  blockchainConfig = blockchainConfig.replace(/adminApiKey:.*/, `adminApiKey:\n    '${config.adminApiKey}',`);
  blockchainConfig = blockchainConfig.replace(/web3Key:.*/, `web3Key:\n    '${config.web3Key}',`);
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

  console.log('Asking faucet for money...');
  await callFaucet(config.deploymentURL, config.adminApiKey, wallet.address);

  return { wallet };
}

async function runConfig() {

  let config = {};

  console.log("🚀 Copying configuration files...\n");
  await copyFiles();

  console.log('\n🔧 MultiBaas Configuration...\n');
  config = { ...config, ... await promptForDeploymentInfo() };
  config = { ...config, ... await provisionApiKeys(config) };
  config = { ...config, ... await setupPrivateDeployerKey(config) };

  writeConfiguration(config);

  console.log('\nConfiguration complete\n\n');
  console.log('\nConfiguration complete\n\n');

  rl.close();

}

// Main script

console.log("\n#### Begin Post-Installation ####\n");
console.log("\nYou will need:\n");
console.log("1. A MultiBaas deployment URL");
console.log("2. A MultiBaas Admin API key for the deployment");
console.log("3. A Reown WalletKit project ID\n");

runConfig();
