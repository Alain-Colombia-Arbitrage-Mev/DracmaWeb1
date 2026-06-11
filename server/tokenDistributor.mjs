import crypto from 'node:crypto';
import { Contract, JsonRpcProvider, Wallet, isAddress, parseUnits } from 'ethers';
import { config } from './config.mjs';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
];

function getSigner() {
  if (!config.bscRpcUrl || !config.tokenDistributorPrivateKey) {
    return null;
  }

  const provider = new JsonRpcProvider(config.bscRpcUrl);
  return new Wallet(config.tokenDistributorPrivateKey, provider);
}

function getDistributorAbi() {
  if (config.tokenDistributorAbiJson) {
    return JSON.parse(config.tokenDistributorAbiJson);
  }

  return [
    `function ${config.tokenDistributorFunction}(address recipient, uint256 amount, string orderId)`,
  ];
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

  const signer = getSigner();
  if (!signer) {
    throw new Error('Missing BSC signer configuration.');
  }

  const amount = parseUnits(String(tokenAmount), config.saleTokenDecimals);

  if (config.tokenDistributionMode === 'erc20-transfer') {
    const token = new Contract(config.saleTokenAddress, ERC20_ABI, signer);
    const tx = await token.transfer(walletAddress, amount);
    const receipt = await tx.wait();

    return {
      skipped: false,
      status: 'sent',
      txHash: receipt?.hash || tx.hash,
    };
  }

  const distributor = new Contract(config.tokenDistributorContractAddress, getDistributorAbi(), signer);
  const tx = await distributor[config.tokenDistributorFunction](walletAddress, amount, orderId);
  const receipt = await tx.wait();

  return {
    skipped: false,
    status: 'sent',
    txHash: receipt?.hash || tx.hash,
  };
}

export function makeOrderHash(orderId) {
  return crypto.createHash('sha256').update(orderId).digest('hex');
}
