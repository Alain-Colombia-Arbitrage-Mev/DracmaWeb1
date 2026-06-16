import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import dotenv from 'dotenv';
import solc from 'solc';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const defaultSaleTokenAddress = '0x8A9f07fdBc75144C9207373597136c6E280A872D';
const expectedConfirmation = 'DRACMA_BSC_MAINNET';

function readRequiredPrivateKey() {
  const rawPrivateKey =
    process.env.TOKEN_DISTRIBUTOR_PRIVATE_KEY ||
    process.env.PRIVATE_KEY_DEPLOYER ||
    process.env.PRIVATE_KEY;
  if (!rawPrivateKey) {
    throw new Error('Missing TOKEN_DISTRIBUTOR_PRIVATE_KEY, PRIVATE_KEY_DEPLOYER, or PRIVATE_KEY.');
  }

  return rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;
}

function compileTokenDistributor() {
  const sourcePath = join(process.cwd(), 'contracts', 'TokenDistributor.sol');
  const input = {
    language: 'Solidity',
    sources: {
      'TokenDistributor.sol': {
        content: readFileSync(sourcePath, 'utf8'),
      },
    },
    settings: {
      evmVersion: 'paris',
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'metadata'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((entry) => entry.severity === 'error') ?? [];
  const warnings = output.errors?.filter((entry) => entry.severity === 'warning') ?? [];

  for (const warning of warnings) {
    console.warn(warning.formattedMessage.trim());
  }

  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.formattedMessage).join('\n'));
  }

  const contract = output.contracts['TokenDistributor.sol'].TokenDistributor;
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    compilerVersion: solc.version(),
    evmVersion: input.settings.evmVersion,
    optimizer: input.settings.optimizer,
  };
}

function writeDeploymentArtifact(artifact) {
  const artifactPath = join(process.cwd(), 'contracts', 'artifacts', 'TokenDistributor.latest.json');
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifactPath;
}

async function main() {
  const privateKey = readRequiredPrivateKey();
  const account = privateKeyToAccount(privateKey);
  const rpcUrl = process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/';
  const saleTokenAddress = process.env.SALE_TOKEN_ADDRESS || defaultSaleTokenAddress;
  const initialOwner = process.env.TOKEN_DISTRIBUTOR_OWNER || account.address;
  const initialOperator = process.env.TOKEN_DISTRIBUTOR_OPERATOR || account.address;
  const dryRun = process.env.DRY_RUN === 'true';
  const deploymentConfirmed = process.env.CONFIRM_MAINNET_DEPLOY === expectedConfirmation;

  if (!isAddress(saleTokenAddress)) {
    throw new Error(`Invalid SALE_TOKEN_ADDRESS: ${saleTokenAddress}`);
  }

  if (!isAddress(initialOwner)) {
    throw new Error(`Invalid TOKEN_DISTRIBUTOR_OWNER: ${initialOwner}`);
  }

  if (!isAddress(initialOperator)) {
    throw new Error(`Invalid TOKEN_DISTRIBUTOR_OPERATOR: ${initialOperator}`);
  }

  const compiled = compileTokenDistributor();
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  if (chainId !== bsc.id) {
    throw new Error(`RPC is not BSC mainnet. Expected chain id 56, received ${chainId}.`);
  }

  const balance = await publicClient.getBalance({ address: account.address });

  console.log('TokenDistributor deploy configuration');
  console.log(`- Network: BNB Smart Chain mainnet (${chainId})`);
  console.log(`- Deployer: ${account.address}`);
  console.log(`- Deployer BNB: ${formatEther(balance)}`);
  console.log(`- Sale token: ${saleTokenAddress}`);
  console.log(`- Initial owner: ${initialOwner}`);
  console.log(`- Initial operator: ${initialOperator}`);
  console.log(`- Compiler: ${compiled.compilerVersion}`);
  console.log(`- EVM version: ${compiled.evmVersion}`);

  if (dryRun || !deploymentConfirmed) {
    console.log('');
    console.log('Dry run only. To deploy, run with:');
    console.log(`CONFIRM_MAINNET_DEPLOY=${expectedConfirmation} npm run deploy:token-distributor:bsc`);
    return;
  }

  const txHash = await walletClient.deployContract({
    abi: compiled.abi,
    bytecode: compiled.bytecode,
    args: [saleTokenAddress, initialOwner, initialOperator],
    account,
  });

  console.log(`Deploy tx: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  if (receipt.status !== 'success' || !receipt.contractAddress) {
    throw new Error(`Deployment failed in tx ${txHash}.`);
  }

  const artifactPath = writeDeploymentArtifact({
    contractName: 'TokenDistributor',
    network: 'bsc-mainnet',
    chainId,
    deployedAddress: receipt.contractAddress,
    deployTxHash: txHash,
    saleTokenAddress,
    initialOwner,
    initialOperator,
    deployer: account.address,
    abi: compiled.abi,
    bytecode: compiled.bytecode,
    compilerVersion: compiled.compilerVersion,
    evmVersion: compiled.evmVersion,
    optimizer: compiled.optimizer,
    deployedAt: new Date().toISOString(),
  });

  console.log('');
  console.log(`TokenDistributor deployed at: ${receipt.contractAddress}`);
  console.log(`Artifact written to: ${artifactPath}`);
  console.log('');
  console.log('Backend env after funding the distributor contract:');
  console.log('TOKEN_DISTRIBUTION_MODE=contract');
  console.log(`TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS=${receipt.contractAddress}`);
  console.log('TOKEN_DISTRIBUTOR_FUNCTION=releaseTokens');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
