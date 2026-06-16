import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCustomCommon, Hardfork, Mainnet } from '@ethereumjs/common';
import { createLegacyTx } from '@ethereumjs/tx';
import { Account, bytesToHex, createAddressFromPrivateKey, createAddressFromString, createContractAddress, hexToBytes } from '@ethereumjs/util';
import { createVM, runTx } from '@ethereumjs/vm';
import solc from 'solc';
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeDeployData,
  encodeFunctionData,
  keccak256,
  parseAbi,
  parseEther,
  toHex,
} from 'viem';

const common = createCustomCommon(
  { chainId: 31337, networkId: 31337 },
  Mainnet,
  { hardfork: Hardfork.Paris },
);

const privateKeys = [
  '0x1111111111111111111111111111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222222222222222222222222222',
  '0x3333333333333333333333333333333333333333333333333333333333333333',
  '0x4444444444444444444444444444444444444444444444444444444444444444',
  '0x5555555555555555555555555555555555555555555555555555555555555555',
].map((privateKey) => {
  const privateKeyBytes = hexToBytes(privateKey);
  const addressObject = createAddressFromPrivateKey(privateKeyBytes);
  return {
    privateKey: privateKeyBytes,
    address: addressObject.toString(),
    addressObject,
  };
});

const mockErc20Source = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    bool public failTransfers;

    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(address initialHolder, uint256 initialSupply) {
        balanceOf[initialHolder] = initialSupply;
        emit Transfer(address(0), initialHolder, initialSupply);
    }

    function setFailTransfers(bool value) external {
        failTransfers = value;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (failTransfers) {
            return false;
        }
        require(to != address(0), "ZERO_TO");
        require(balanceOf[msg.sender] >= amount, "BALANCE");
        unchecked {
            balanceOf[msg.sender] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(msg.sender, to, amount);
        return true;
    }
}
`;

const tokenAbi = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function setFailTransfers(bool value)',
]);

function compileContracts() {
  const distributorPath = join(process.cwd(), 'contracts', 'TokenDistributor.sol');
  const input = {
    language: 'Solidity',
    sources: {
      'TokenDistributor.sol': {
        content: readFileSync(distributorPath, 'utf8'),
      },
      'MockERC20.sol': {
        content: mockErc20Source,
      },
    },
    settings: {
      evmVersion: 'paris',
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = output.errors?.filter((entry) => entry.severity === 'error') ?? [];
  assert.deepEqual(errors, []);

  const token = output.contracts['MockERC20.sol'].MockERC20;
  const distributor = output.contracts['TokenDistributor.sol'].TokenDistributor;

  return {
    token: {
      abi: token.abi,
      bytecode: `0x${token.evm.bytecode.object}`,
    },
    distributor: {
      abi: distributor.abi,
      bytecode: `0x${distributor.evm.bytecode.object}`,
    },
  };
}

async function createFundedVm() {
  const vm = await createVM({ common });

  for (const account of privateKeys) {
    await vm.stateManager.putAccount(account.addressObject, new Account(0n, parseEther('100')));
  }

  return vm;
}

async function sendTransaction(vm, from, { to, data = '0x', value = 0n, gasLimit = 8_000_000n }) {
  const account = await vm.stateManager.getAccount(from.addressObject);
  const tx = createLegacyTx(
    {
      nonce: account?.nonce ?? 0n,
      gasLimit,
      gasPrice: 10n,
      to: to ? createAddressFromString(to) : undefined,
      value,
      data: hexToBytes(data),
    },
    { common },
  ).sign(from.privateKey);

  const result = await runTx(vm, { tx });

  if (result.execResult.exceptionError || result.receipt.status !== 1) {
    const reason = result.execResult.exceptionError?.error ?? 'transaction reverted';
    throw new Error(`EVM transaction failed: ${reason}`);
  }

  return result;
}

async function deployContract(vm, from, { abi, bytecode }, args = []) {
  const account = await vm.stateManager.getAccount(from.addressObject);
  const contractAddress = createContractAddress(from.addressObject, account?.nonce ?? 0n).toString();
  const data = encodeDeployData({ abi, bytecode, args });
  await sendTransaction(vm, from, { data });
  return contractAddress;
}

async function writeContract(fixture, { address, abi, functionName, args = [], account = fixture.owner }) {
  return sendTransaction(fixture.vm, account, {
    to: address,
    data: encodeFunctionData({ abi, functionName, args }),
  });
}

async function readContract(fixture, { address, abi, functionName, args = [], account = fixture.owner }) {
  const result = await fixture.vm.evm.runCall({
    caller: account.addressObject,
    to: createAddressFromString(address),
    data: hexToBytes(encodeFunctionData({ abi, functionName, args })),
    gasLimit: 8_000_000n,
  });

  if (result.execResult.exceptionError) {
    throw new Error(`EVM call failed: ${result.execResult.exceptionError.error}`);
  }

  return decodeFunctionResult({
    abi,
    functionName,
    data: bytesToHex(result.execResult.returnValue),
  });
}

async function deployFixture() {
  const compiled = compileContracts();
  const vm = await createFundedVm();
  const [owner, buyer, operator, attacker, nextOwner] = privateKeys;

  const token = await deployContract(vm, owner, compiled.token, [owner.address, parseEther('1000000')]);
  const distributor = await deployContract(vm, owner, compiled.distributor, [token, owner.address, operator.address]);

  await writeContract(
    { vm, compiled, owner, token, distributor },
    {
      address: token,
      abi: tokenAbi,
      functionName: 'transfer',
      args: [distributor, parseEther('10000')],
      account: owner,
    },
  );

  return {
    vm,
    compiled,
    owner,
    buyer,
    operator,
    attacker,
    nextOwner,
    token,
    distributor,
  };
}

async function readTokenBalance(fixture, account) {
  return readContract(fixture, {
    address: fixture.token,
    abi: tokenAbi,
    functionName: 'balanceOf',
    args: [account],
  });
}

async function release(fixture, args, account = fixture.operator) {
  return writeContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'releaseTokens',
    args,
    account,
  });
}

function decodedDistributorEvents(fixture, result) {
  return result.execResult.logs
    .map(([, topics, data]) => {
      try {
        return decodeEventLog({
          abi: fixture.compiled.distributor.abi,
          data: bytesToHex(data),
          topics: topics.map(bytesToHex),
        });
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

test('operator releases a paid order once and records the order hash', async () => {
  const fixture = await deployFixture();
  const amount = parseEther('250');
  const orderId = 'DRC-paid-001';
  const receipt = await release(fixture, [fixture.buyer.address, amount, orderId]);

  const buyerBalance = await readTokenBalance(fixture, fixture.buyer.address);
  assert.equal(buyerBalance, amount);

  const orderHash = keccak256(toHex(orderId));
  const released = await readContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'releasedOrders',
    args: [orderHash],
  });
  assert.equal(released, true);

  const events = decodedDistributorEvents(fixture, receipt);
  assert.equal(events.some((event) => event.eventName === 'TokensReleased'), true);

  await assert.rejects(() => release(fixture, [fixture.buyer.address, amount, orderId]));
});

test('unauthorized wallets cannot release and operator cannot withdraw tokens', async () => {
  const fixture = await deployFixture();

  await assert.rejects(() =>
    release(
      fixture,
      [fixture.buyer.address, parseEther('10'), 'DRC-attacker-001'],
      fixture.attacker,
    ),
  );

  await assert.rejects(() =>
    writeContract(fixture, {
      address: fixture.distributor,
      abi: fixture.compiled.distributor.abi,
      functionName: 'withdrawTokens',
      args: [fixture.operator.address, parseEther('10')],
      account: fixture.operator,
    }),
  );
});

test('owner can rotate the release operator', async () => {
  const fixture = await deployFixture();

  await writeContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'setOperator',
    args: [fixture.nextOwner.address],
    account: fixture.owner,
  });

  const operator = await readContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'operator',
  });
  assert.equal(operator.toLowerCase(), fixture.nextOwner.address.toLowerCase());

  await assert.rejects(() =>
    release(fixture, [fixture.buyer.address, parseEther('1'), 'DRC-old-operator'], fixture.operator),
  );

  await release(fixture, [fixture.buyer.address, parseEther('1'), 'DRC-new-operator'], fixture.nextOwner);
});

test('release validates recipient, amount, and order id', async () => {
  const fixture = await deployFixture();

  await assert.rejects(() =>
    release(fixture, ['0x0000000000000000000000000000000000000000', parseEther('1'), 'DRC-zero-recipient']),
  );
  await assert.rejects(() =>
    release(fixture, [fixture.buyer.address, 0n, 'DRC-zero-amount']),
  );
  await assert.rejects(() =>
    release(fixture, [fixture.buyer.address, parseEther('1'), '']),
  );
});

test('owner can rotate ownership with acceptance and withdraw undistributed inventory', async () => {
  const fixture = await deployFixture();

  await writeContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'transferOwnership',
    args: [fixture.nextOwner.address],
    account: fixture.owner,
  });

  await assert.rejects(() =>
    writeContract(fixture, {
      address: fixture.distributor,
      abi: fixture.compiled.distributor.abi,
      functionName: 'withdrawTokens',
      args: [fixture.nextOwner.address, parseEther('5')],
      account: fixture.nextOwner,
    }),
  );

  await writeContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'acceptOwnership',
    account: fixture.nextOwner,
  });

  const owner = await readContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'owner',
  });
  assert.equal(owner.toLowerCase(), fixture.nextOwner.address.toLowerCase());

  const amount = parseEther('5');
  await writeContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'withdrawTokens',
    args: [fixture.nextOwner.address, amount],
    account: fixture.nextOwner,
  });

  const nextOwnerBalance = await readTokenBalance(fixture, fixture.nextOwner.address);
  assert.equal(nextOwnerBalance, amount);
});

test('release reverts and keeps the order reusable when the ERC20 transfer fails', async () => {
  const fixture = await deployFixture();

  await writeContract(fixture, {
    address: fixture.token,
    abi: tokenAbi,
    functionName: 'setFailTransfers',
    args: [true],
    account: fixture.owner,
  });

  const orderId = 'DRC-transfer-fails';
  await assert.rejects(() => release(fixture, [fixture.buyer.address, parseEther('1'), orderId]));

  const orderHash = keccak256(toHex(orderId));
  const released = await readContract(fixture, {
    address: fixture.distributor,
    abi: fixture.compiled.distributor.abi,
    functionName: 'releasedOrders',
    args: [orderHash],
  });
  assert.equal(released, false);
});
