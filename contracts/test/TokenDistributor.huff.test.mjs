import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, test } from 'node:test';

import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getContract,
  http,
  keccak256,
  parseAbi,
  zeroAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const huffContractPath = path.join(repoRoot, 'contracts', 'src', 'TokenDistributor.huff');
const isolatedToolsRoot = path.join(repoRoot, 'contracts', '.huff-test-deps');
const isolatedToolsPackage = path.join(isolatedToolsRoot, 'package.json');

const localChain = {
  id: 1337,
  name: 'Local EVM',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
};

const tokenAbi = parseAbi([
  'function mint(address to, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

const distributorAbi = parseAbi([
  'function initialize(address token, address owner)',
  'function owner() view returns (address)',
  'function saleToken() view returns (address)',
  'function isOrderReleased(bytes32 orderHash) view returns (bool)',
  'function releaseTokens(address recipient, uint256 amount, string orderId)',
  'function transferOwnership(address newOwner)',
  'function withdrawTokens(address to, uint256 amount)',
  'event TokensReleased(address indexed recipient, uint256 amount, bytes32 indexed orderHash)',
]);

const testTokenSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract TestToken {
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "BALANCE");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
`;

let ganache;
let solc;
let compiledTokenBytecode;
let compiledDistributorBytecode;

function npmCliPath() {
  return process.env.npm_execpath
    || path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
}

function runNpm(args, options = {}) {
  return execFileSync(process.execPath, [npmCliPath(), ...args], options);
}

function loadIsolatedTool(name) {
  const toolRequire = createRequire(isolatedToolsPackage);
  return toolRequire(name);
}

function ensureHuffTestTools() {
  if (ganache && solc) return;

  try {
    const rootRequire = createRequire(path.join(repoRoot, 'package.json'));
    ganache = rootRequire('ganache');
    solc = rootRequire('solc');
    return;
  } catch {
    // Fall through to isolated install. This keeps vulnerable test tooling out of the app lockfile.
  }

  runNpm(
    [
      'install',
      '--prefix',
      isolatedToolsRoot,
      '--no-save',
      '--silent',
      'ganache@7.9.2',
      'solc@0.8.35',
    ],
    { cwd: repoRoot, stdio: 'inherit' },
  );

  ganache = loadIsolatedTool('ganache');
  solc = loadIsolatedTool('solc');
}

function compileSolidityToken() {
  if (compiledTokenBytecode) return compiledTokenBytecode;

  const input = {
    language: 'Solidity',
    sources: { 'TestToken.sol': { content: testTokenSource } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['evm.bytecode.object'] } },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((item) => item.severity === 'error') ?? [];
  assert.deepEqual(errors, []);

  compiledTokenBytecode = `0x${output.contracts['TestToken.sol'].TestToken.evm.bytecode.object}`;
  return compiledTokenBytecode;
}

function compileHuffDistributor() {
  if (compiledDistributorBytecode) return compiledDistributorBytecode;

  assert.ok(existsSync(huffContractPath), 'contracts/src/TokenDistributor.huff must exist');

  const output = runNpm(
    ['exec', '--yes', '--package', 'huffc@0.0.25', '--', 'huffc', huffContractPath, '--bytecode', '--paste', '--no-linebreak'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();

  const bytecode = output.startsWith('{') ? JSON.parse(output).bytecode : output;
  assert.match(bytecode, /^[0-9a-fA-F]+$/, 'huffc must return deploy bytecode');
  compiledDistributorBytecode = `0x${bytecode}`;
  return compiledDistributorBytecode;
}

function orderHash(orderId) {
  return keccak256(new TextEncoder().encode(orderId));
}

async function deployBytecode(walletClient, publicClient, bytecode) {
  const hash = await walletClient.deployContract({ abi: [], bytecode });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  assert.ok(receipt.contractAddress);
  return receipt.contractAddress;
}

async function expectRevert(promise) {
  await assert.rejects(promise, /revert|reverted|execution reverted|transaction failed|CallExecutionError/i);
}

let provider;
let publicClient;
let ownerClient;
let buyerClient;
let owner;
let buyer;
let token;
let distributor;
let distributorContract;
let tokenContract;

beforeEach(async () => {
  ensureHuffTestTools();

  provider = ganache.provider({
    logging: { quiet: true },
    wallet: { totalAccounts: 4, defaultBalance: 1000 },
  });

  const accounts = Object.values(provider.getInitialAccounts());
  owner = privateKeyToAccount(accounts[0].secretKey);
  buyer = privateKeyToAccount(accounts[1].secretKey);

  const transport = custom(provider);
  publicClient = createPublicClient({ chain: localChain, transport });
  ownerClient = createWalletClient({ account: owner, chain: localChain, transport });
  buyerClient = createWalletClient({ account: buyer, chain: localChain, transport });

  token = await deployBytecode(ownerClient, publicClient, compileSolidityToken());
  distributor = await deployBytecode(ownerClient, publicClient, compileHuffDistributor());

  tokenContract = getContract({
    address: token,
    abi: tokenAbi,
    client: { public: publicClient, wallet: ownerClient },
  });

  distributorContract = getContract({
    address: distributor,
    abi: distributorAbi,
    client: { public: publicClient, wallet: ownerClient },
  });

  await publicClient.waitForTransactionReceipt({
    hash: await distributorContract.write.initialize([token, owner.address]),
  });

  await publicClient.waitForTransactionReceipt({
    hash: await tokenContract.write.mint([distributor, 1_000_000n * 10n ** 18n]),
  });
});

test('initializes sale token and owner once', async () => {
  assert.equal((await distributorContract.read.saleToken()).toLowerCase(), token.toLowerCase());
  assert.equal((await distributorContract.read.owner()).toLowerCase(), owner.address.toLowerCase());

  await expectRevert(distributorContract.write.initialize([token, owner.address]));
  await expectRevert(distributorContract.write.initialize([zeroAddress, owner.address]));
});

test('owner releases tokens once per order id', async () => {
  const amount = 5_000n * 10n ** 18n;
  const id = 'np-order-1001';
  const idHash = orderHash(id);

  await publicClient.waitForTransactionReceipt({
    hash: await distributorContract.write.releaseTokens([buyer.address, amount, id]),
  });

  assert.equal(await tokenContract.read.balanceOf([buyer.address]), amount);
  assert.equal(await distributorContract.read.isOrderReleased([idHash]), true);

  await expectRevert(distributorContract.write.releaseTokens([buyer.address, amount, id]));
});

test('non-owner cannot release or withdraw tokens', async () => {
  const buyerDistributor = getContract({
    address: distributor,
    abi: distributorAbi,
    client: { public: publicClient, wallet: buyerClient },
  });

  await expectRevert(
    buyerDistributor.write.releaseTokens([buyer.address, 1n * 10n ** 18n, 'np-order-2001']),
  );
  await expectRevert(
    buyerDistributor.write.withdrawTokens([buyer.address, 1n * 10n ** 18n]),
  );
});

test('owner can rotate owner and withdraw undistributed tokens', async () => {
  const amount = 123n * 10n ** 18n;

  await publicClient.waitForTransactionReceipt({
    hash: await distributorContract.write.transferOwnership([buyer.address]),
  });

  assert.equal((await distributorContract.read.owner()).toLowerCase(), buyer.address.toLowerCase());

  const buyerDistributor = getContract({
    address: distributor,
    abi: distributorAbi,
    client: { public: publicClient, wallet: buyerClient },
  });

  await publicClient.waitForTransactionReceipt({
    hash: await buyerDistributor.write.withdrawTokens([buyer.address, amount]),
  });

  assert.equal(await tokenContract.read.balanceOf([buyer.address]), amount);
});
