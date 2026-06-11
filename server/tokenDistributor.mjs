import crypto from 'node:crypto';
import { createPublicClient, createWalletClient, http, isAddress, parseAbi, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { config } from './config.mjs';

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
]);

function getClients() {
  if (!config.bscRpcUrl || !config.tokenDistributorPrivateKey) {
    return null;
  }

  const privateKey = config.tokenDistributorPrivateKey.startsWith('0x')
    ? config.tokenDistributorPrivateKey
    : `0x${config.tokenDistributorPrivateKey}`;
  const account = privateKeyToAccount(privateKey);
  const transport = http(config.bscRpcUrl);

  return {
    account,
    publicClient: createPublicClient({
      chain: bsc,
      transport,
    }),
    walletClient: createWalletClient({
      account,
      chain: bsc,
      transport,
    }),
  };
}

function getDistributorAbi() {
  if (config.tokenDistributorAbiJson) {
    return JSON.parse(config.tokenDistributorAbiJson);
  }

  return parseAbi([
    `function ${config.tokenDistributorFunction}(address recipient, uint256 amount, string orderId)`,
  ]);
}

export function distributionIsConfigured() {
  if (config.tokenDistributionMode === 'disabled') return false;
  if (!config.tokenDistributorPrivateKey) return false;
  if (config.tokenDistributionMode === 'erc20-transfer') return isAddress(config.saleTokenAddress);
  if (config.tokenDistributionMode === 'contract') return isAddress(config.tokenDistributorContractAddress);
  return false;
}

export async function distributeTokens({ walletAddress, tokenAmount, orderId }) {
  if (!distributionIsConfigured()) {
    return {
      skipped: true,
      status: 'pending_configuration',
      reason: 'Token distribution is not configured. Set TOKEN_DISTRIBUTION_MODE and signer env vars.',
    };
  }

  if (!isAddress(walletAddress)) {
    throw new Error('Invalid recipient wallet address.');
  }

  const clients = getClients();
  if (!clients) {
    throw new Error('Missing BSC signer configuration.');
  }

  const amount = parseUnits(String(tokenAmount), config.saleTokenDecimals);

  if (config.tokenDistributionMode === 'erc20-transfer') {
    const txHash = await clients.walletClient.writeContract({
      address: config.saleTokenAddress,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [walletAddress, amount],
    });
    await clients.publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      skipped: false,
      status: 'sent',
      txHash,
    };
  }

  const txHash = await clients.walletClient.writeContract({
    address: config.tokenDistributorContractAddress,
    abi: getDistributorAbi(),
    functionName: config.tokenDistributorFunction,
    args: [walletAddress, amount, orderId],
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    skipped: false,
    status: 'sent',
    txHash,
  };
}

export function makeOrderHash(orderId) {
  return crypto.createHash('sha256').update(orderId).digest('hex');
}
