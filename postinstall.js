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
  // deploymentURL = deploymentURL.replace(/\/+$/, ''); // Remove trailing slashes

  let adminApiKey = await askQuestion('Enter MultiBaas Admin API Key: ');
  adminApiKey = adminApiKey.replace(/[\r\n\s]+/g, ''); // Remove newlines and spaces


  // Update blockchain config file
  const blockchainConfigPath = configFiles[0].destination;
  let blockchainConfig = fs.readFileSync(blockchainConfigPath, 'utf8');
  blockchainConfig = blockchainConfig.replace(/deploymentEndpoint:.*/, `deploymentEndpoint: '${deploymentURL}',`);
  blockchainConfig = blockchainConfig.replace(/adminApiKey:.*/, `adminApiKey:\n    '${adminApiKey}',`);
  fs.writeFileSync(blockchainConfigPath, blockchainConfig, 'utf8');
  console.log(`✅ Updated ${blockchainConfigPath}.`);

  // Update frontend config file
  const frontendConfigPath = configFiles[1].destination;
  let frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
  frontendConfig = frontendConfig.replace(/NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL=.*/, `NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL='${deploymentURL}',`);
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
