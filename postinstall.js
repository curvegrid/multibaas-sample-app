const fs = require('fs');
const readline = require('readline');
const path = require('path');

const configFiles = [
  {
    source: path.join(__dirname, 'blockchain', 'deployment-config.template.js'),
    destination: path.join(__dirname, 'blockchain', 'deployment-config.development.js'),
  },
  {
    source: path.join(__dirname, 'frontend', '.env.template'),
    destination: path.join(__dirname, 'frontend', '.env.development'),
  },
];

// Function to prompt user for overwrite confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
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
  rl.close();
}

// Main script

console.log("\n#### Begin Post-Installation ####\n");
console.log("🚀 Copying configuration files...\n");
copyFiles();
