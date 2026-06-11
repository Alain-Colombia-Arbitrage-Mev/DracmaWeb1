import 'dotenv/config';

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const huffContractPath = path.join(repoRoot, 'contracts', 'src', 'TokenDistributor.huff');

const distributorAbi = parseAbi([
  'function initialize(address token, address owner)',
  'function owner() view returns (address)',
  'function saleToken() view returns (address)',
  'function releaseTokens(address recipient, uint256 amount, string orderId)',
  'function transferOwnership(address newOwner)',
  'function withdrawTokens(address to, uint256 amount)',
]);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function normalizePrivateKey(value) {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function npmCliPath() {
  return process.env.npm_execpath
    || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
}

function runNpm(args, options = {}) {
  return execFileSync(process.execPath, [npmCliPath(), ...args], options);
}

function compileHuffDistributor() {
  const output = runNpm(
    ['exec', '--yes', '--package', 'huffc@0.0.25', '--', 'huffc', huffContractPath, '--bytecode', '--paste', '--no-linebreak'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();

  const bytecode = output.startsWith('{') ? JSON.parse(output).bytecode : output;
  if (!/^[0-9a-fA-F]+$/.test(bytecode)) {
    throw new Error('huffc did not return deploy bytecode.');
  }
  return `0x${bytecode}`;
}

const rpcUrl = requiredEnv('BSC_RPC_URL');
const rawPrivateKey = process.env.TOKEN_DISTRIBUTOR_PRIVATE_KEY || process.env.PRIVATE_KEY;
if (!rawPrivateKey) {
  throw new Error('Missing TOKEN_DISTRIBUTOR_PRIVATE_KEY or PRIVATE_KEY.');
}

const privateKey = normalizePrivateKey(rawPrivateKey);
const saleToken = process.env.SALE_TOKEN_ADDRESS || '0x8A9f07fdBc75144C9207373597136c6E280A872D';
if (!isAddress(saleToken)) {
  throw new Error('SALE_TOKEN_ADDRESS is not a valid address.');
}

const account = privateKeyToAccount(privateKey);
const owner = process.env.TOKEN_DISTRIBUTOR_OWNER || account.address;
if (!isAddress(owner)) {
  throw new Error('TOKEN_DISTRIBUTOR_OWNER is not a valid address.');
}

const transport = http(rpcUrl);
const publicClient = createPublicClient({ chain: bsc, transport });
const walletClient = createWalletClient({ account, chain: bsc, transport });

console.log('Compiling Huff distributor...');
const bytecode = compileHuffDistributor();

console.log('Deploying TokenDistributor on BSC...');
const deployHash = await walletClient.deployContract({
  abi: distributorAbi,
  bytecode,
});
const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
const distributorAddress = deployReceipt.contractAddress;
if (!distributorAddress) {
  throw new Error('Deployment did not return a contract address.');
}

console.log(`TokenDistributor deployed: ${distributorAddress}`);
console.log('Initializing distributor...');
const initHash = await walletClient.writeContract({
  address: distributorAddress,
  abi: distributorAbi,
  functionName: 'initialize',
  args: [saleToken, owner],
});
await publicClient.waitForTransactionReceipt({ hash: initHash });

const [storedToken, storedOwner] = await Promise.all([
  publicClient.readContract({
    address: distributorAddress,
    abi: distributorAbi,
    functionName: 'saleToken',
  }),
  publicClient.readContract({
    address: distributorAddress,
    abi: distributorAbi,
    functionName: 'owner',
  }),
]);

console.log('');
console.log('=== HUFF DISTRIBUTOR DEPLOYED ===');
console.log(`TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS=${distributorAddress}`);
console.log(`SALE_TOKEN_ADDRESS=${storedToken}`);
console.log(`TOKEN_DISTRIBUTOR_OWNER=${storedOwner}`);
console.log('');
console.log('Next steps:');
console.log('1. Transfer DRACMA sale inventory to the distributor contract.');
console.log('2. Set TOKEN_DISTRIBUTION_MODE=contract on the backend.');
console.log('3. Set TOKEN_DISTRIBUTOR_FUNCTION=releaseTokens on the backend.');
