const deploymentConfig = {
  // Private key of the deployer account, beginning with 0x
  deployerPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000000',

  // Full URL such as https://abc123.multibaas.com
  deploymentEndpoint: 'https://<DEPLOYMENT ID>.multibaas.com',

  // RPC URL of the blockchain network is required if a web3Key is not provided
  // This is required for networks that where MultiBaas does not support the web3 proxy feature
  rpcUrl: 'https://sepolia.base.org',

  // Chain ID for Base Sepolia
  chainId: 84532,

  // API key to access MultiBaas from deployer
  // Note that the API key MUST be part of the "Administrators" group
  // Create one on MultiBaas via navigation bar > Admin > API Keys
  adminApiKey: '<API KEY IN ADMINISTRATOR GROUP>',

  // Token contract addresses on Base Sepolia
  // USDC: Official Circle deployment
  // JPYC: Custom deployed FiatTokenV2 contract
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  // replace jpyc address if you wanna use your own contract
  jpycAddress: '0xa5A9309d500f6f94ac28319339853D05D95a4251',
};

module.exports = {
  deploymentConfig,
};
