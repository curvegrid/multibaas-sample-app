const fs = require('fs');
const readline = require('readline');
const path = require('path');

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

async function promptForDeploymentInfo() {
  // Prompt for MultiBaas config only if files exists
  for (const { destination } of configFiles) {
    if (!fs.existsSync(destination)) {
      console.log(`❌ Missing configuration file ${destination}`);
      return false;
    }
  }

  let deploymentURL = await askQuestion('Enter MultiBaas Deployment URL: ');
  let url = new URL(deploymentURL);
  deploymentURL = `${url.protocol}//${url.hostname}`; // Keep only protocol + domain

  let adminApiKey = await askQuestion('Enter MultiBaas Admin API Key: ');
  adminApiKey = adminApiKey.replace(/[\r\n\s]+/g, ''); // Remove newlines and spaces

  const date = new Date();
  const dateString = new Date().toISOString().replace(/[^\d]/g, '');


  // Create Web3 API Key
  const WEB_3_GROUP_ID = 6;
  const web3KeyLabel = `web3key_${dateString}`;

  let web3Key = await createAPIKey(deploymentURL, adminApiKey, web3KeyLabel, WEB_3_GROUP_ID);
  console.log('✅ Created Web3 API Key: ', web3Key);


  // Create DApp User API Key
  const DAPP_USER_GROUP_ID = 5;
  const dappUserKeyLabel = `dapp_user_key_${dateString}`;

  let dappUserKey = await createAPIKey(deploymentURL, adminApiKey, dappUserKeyLabel, DAPP_USER_GROUP_ID);
  console.log('✅ Created Dapp User API Key: ', dappUserKey);


  // Update blockchain config file
  const blockchainConfigPath = configFiles[0].destination;
  let blockchainConfig = fs.readFileSync(blockchainConfigPath, 'utf8');
  blockchainConfig = blockchainConfig.replace(/deploymentEndpoint:.*/, `deploymentEndpoint: '${deploymentURL}',`);
  blockchainConfig = blockchainConfig.replace(/adminApiKey:.*/, `adminApiKey:\n    '${adminApiKey}',`);
  blockchainConfig = blockchainConfig.replace(/web3Key:.*/, `web3Key:\n    '${web3Key}',`);
  fs.writeFileSync(blockchainConfigPath, blockchainConfig, 'utf8');
  console.log(`✅ Updated ${blockchainConfigPath}.`);


  // Update frontend config file
  const frontendConfigPath = configFiles[1].destination;
  let frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL=.*/, `NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL='${deploymentURL}',`);
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY=.*/, `NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY='${web3Key}',`);
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY=.*/, `NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY='${dappUserKey}',`);
  fs.writeFileSync(frontendConfigPath, frontendConfig, 'utf8');
  console.log(`✅ Updated ${frontendConfigPath}.`);
}

async function runConfig() {

  console.log("🚀 Copying configuration files...\n");
  await copyFiles();

  console.log('\n🔧 MultiBaas Configuration...\n');
  await promptForDeploymentInfo();

  rl.close();

}

// Main script

console.log("\n#### Begin Post-Installation ####\n");
console.log("\nYou will need:\n");
console.log("1. A MultiBaas deployment URL");
console.log("2. A MultiBaas Admin API key for the deployment\n");

runConfig();
