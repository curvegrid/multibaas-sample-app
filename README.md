# MultiBaas Sample App

The purpose of this project is to demonstrate how to build a frontend-only decentralized application that uses [MultiBaas](https://docs.curvegrid.com/multibaas/) to handle the complexities of interacting with an EVM smart contract.

The repository consists of two sub-projects:

- The `blockchain` folder contains a [Hardhat](https://hardhat.org/) project that uses the [Hardhat MultiBaas Plugin](https://github.com/curvegrid/hardhat-multibaas-plugin) to compile the `SimpleVoting` smart contract, deploy it to the network, and link it to a MultiBaas deployment so that we can interact with it via the REST API.
- The `frontend` folder contains a Next.js web application that provides a UI for interacting with the smart contract using the [MultiBaas SDK](https://github.com/curvegrid/multibaas-sdk-typescript).

## MultiBaas Deployment Setup

Using the [Curvegrid Console](https://console.curvegrid.com/), create a MultiBaas deployment on the Curvegrid Testnet. We recommend using this network for smart contract development due to its near-instant block finality and easily accessible faucet for account funding. It is also possible to use this demo app on another network, but it will require minor modification and alteration of setup procedure.

### Connecting to the Curvegrid Testnet

Once you have created and logged into your MultiBaas Deployment, you may automatically configure your MetaMask to connect to the Curvegrid Test Network by clicking the `Select Signer` button in the top navbar and then clicking `Switch Network` button. Click the `Continue` button in `Add Network` modal. MetaMask will prompt you that MultiBaas is adding a network on your behalf. Review the details, click the `Approve` button, and then finally click the `Switch network` button.

### Requesting Ether from the Faucet

Via the top navbar, go to the `Blockchain > Faucet` page and request 1 ETH to your deployer account address.

### Creating API Keys

There are three API keys that **MUST** be created and used within this project.

1. Navigate to the `Admin > API Keys` page and create a new key with the label `hardhat_admin`, adding it to the `Administrators` group. This API key has admin permission over the MultiBaas deployment, so copy it somewhere safe.

2. While on the same page, create another API key with the label `nextjs_frontend` and add it to the `DApp User` group. This API key only has permission to read existing data on the blockchain, such as the state variables of a smart contract deployment, and to request MultiBaas to format and return an unsigned transaction for a specific interaction.

3. Finally, create another API key with the label `web3_proxy` and select the option to `Use this key as a public Web3 key`. This API key will be used to construct an RPC URL for interacting with the Curvegrid Testnet. The UI will automatically construct and display the URL in the form of `https://<DEPLOYMENT ID>.multibaas.com/web3/<API KEY IN WEB3 GROUP>`, but copy and save just the API key at the end.

Please make sure not to mix up these API keys.

Now, navigate to the `Admin > CORS Origins` page and add `http://localhost:3000` to the list of allowed origins. By default, MultiBaas does not allow unknown remote clients to make API requests, so by adding the URL above, you are giving permission to your local Next.js app to query MultiBaas.

## Install Dependencies
```sh
npm install
```

## Contract Deployment via Hardhat

If you have not yet deployed the `SimpleVoting.sol` smart contract to your MultiBaas deployment, we will now do so using the Hardhat project.

Prepare the project for deployment:

```sh
cd blockchain
cp deployment-config.template.js deployment-config.development.js
```

Now, you will need to fill in the fields of `deployment-config.development.js`.
- `deployerPrivateKey` should be set to the private key of your account with ETH on your target network, starting with `0x`. This key may be exported from MetaMask by clicking the `Account details` button in the menu of the account selector list, but please be sure only do this on a development-only account. It is strongly advised not to check it into source control.
- `deploymentEndpoint` should be your MultiBaas Deployment URL, beginning with `https://` and ending with `.com`.
- `ethChainID` should be `2017072401` for the Curvegrid Testnet.
- `web3Key` should be set to the API Key you previously created with label `web3_proxy`. Be sure to only include the API key and not the rest of the URL.
- `rpcUrl` is to be used instead of the `web3Key` for networks where MultiBaas does not support the web3 proxy feature. You should omit this field (leave it blank) if you are using the Curvegrid Testnet. If you are instead using another network, you may omit the `web3Key` and instead use an RPC URL from [ChainList](https://chainlist.org/).
- `adminApiKey` should be set to the API Key you previously created with label `hardhat_admin`.

Finally, deploy the smart-contract:

```sh
npm run deploy:voting:dev
```

Navigate to your MultiBaas deployment and confirm that you can see the contract on the `Contracts > On-Chain` page.

## Next.js Frontend

Now, we will setup the frontend application to interact with MultiBaas. This application uses [RainbowKit](https://www.rainbowkit.com/docs/installation) to support interaction with a variety of wallets.

Start by setting up the project.

```sh
cd frontend
cp .env.template .env.development
```

Now, you will need to fill in the fields of `.env.development`
- If you want to use WalletConnect, `NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID` should be set to the Project ID of a WalletKit project on [reown](https://cloud.reown.com/).
- `NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL` should be set to your MultiBaas deployment URL, beginning with `https://` and ending with `.com`, same as before.
- `NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY` should be set to the API Key you previously created with label `nextjs_frontend`.
- `NEXT_PUBLIC_MULTIBAAS_WEB3_API_KEY` should be set to the API Key you previously created with label `web3_proxy`. This is required to connect RainbowKit to the custom Curvegrid Test Network.
- `NEXT_PUBLIC_MULTIBAAS_VOTING_CONTRACT_LABEL` and `NEXT_PUBLIC_MULTIBAAS_VOTING_ADDRESS_LABEL` should match the `contractLabel` and `addressLabel` specified in `blockchain/scripts/deploy-mb.ts`. By default, these are both set to `simple_voting`.

Now, you should be able to run:

```sh
npm run dev
```

and load the dApp in your browser at http://localhost:3000.

To interact with the smart contract, first connect your wallet using the RainbowKit button located in the top-right corner.

In the center of the page, you should see the different voting options as well as the number of votes for each option.

Hover over a voting option. If it turns green, clicking it will prompt you to sign a transaction to cast or change your vote to that option. If it turns red, clicking it will prompt you to sign a transaction to clear your existing vote.

You can experiment with the smart contract by switching to different accounts in RainbowKit and casting additional votes. If you’re working on the project as a team, each member can configure their own `.env.development` to point to the same MultiBaas deployment URL.

Since the `nextjs_frontend` and `web3_proxy` API keys have restricted permissions, they are safe to use directly in the frontend code even in production use cases. For these two API keys, the same values may be shared and used among team members.

However, since the `hardhat_admin` API key has admin-level permissions over the deployment, it is best practice for each team member to generate and securely store their own API key. It is strongly advised not to check it into source control.
