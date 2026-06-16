# DRACMA Token Distributor

`TokenDistributor.sol` holds DRACMA sale inventory and releases tokens only when the backend owner signer calls:

```solidity
releaseTokens(address recipient, uint256 amount, string orderId)
```

The `orderId` is hashed and marked as released, so a NOWPayments order cannot be distributed twice.
`owner` controls withdrawals and admin settings. `operator` can only release paid orders and is the recommended backend signer.

## Test

```bash
npm run test:contracts
```

## BSC Mainnet Deploy

Set these values in `.env.local` or in the shell. Do not commit real keys.

```bash
BSC_RPC_URL=https://bsc-dataseed.binance.org/
SALE_TOKEN_ADDRESS=0x8A9f07fdBc75144C9207373597136c6E280A872D
PRIVATE_KEY_DEPLOYER=...
TOKEN_DISTRIBUTOR_OWNER=...
TOKEN_DISTRIBUTOR_OPERATOR=...
```

The deploy script also accepts `TOKEN_DISTRIBUTOR_PRIVATE_KEY` or `PRIVATE_KEY`, but `PRIVATE_KEY_DEPLOYER` matches the current `.env` setup.

If `TOKEN_DISTRIBUTOR_OWNER` or `TOKEN_DISTRIBUTOR_OPERATOR` is empty, the deployer wallet is used. For production, prefer a cold/multisig owner and a separate backend operator wallet.

Dry-run first:

```bash
npm run deploy:token-distributor:bsc
```

Deploy to BSC mainnet only after checking the printed deployer, owner, token address, and BNB balance:

```bash
CONFIRM_MAINNET_DEPLOY=DRACMA_BSC_MAINNET npm run deploy:token-distributor:bsc
```

On Windows PowerShell:

```powershell
$env:CONFIRM_MAINNET_DEPLOY='DRACMA_BSC_MAINNET'
npm run deploy:token-distributor:bsc
```

After deploy:

1. Transfer the DRACMA sale inventory to the deployed `TokenDistributor` address.
2. Configure the backend:

```bash
TOKEN_DISTRIBUTION_MODE=contract
TOKEN_DISTRIBUTOR_CONTRACT_ADDRESS=<deployed-address>
TOKEN_DISTRIBUTOR_FUNCTION=releaseTokens
TOKEN_DISTRIBUTOR_PRIVATE_KEY=<operator-private-key>
```

3. Restart the backend.
4. Check `/api/health` and confirm `distributionMode` is `contract`.

## Security Notes

- `operator` can release tokens for paid orders.
- Only `owner` can withdraw tokens or rotate admin/operator settings.
- Ownership transfer is two-step: `transferOwnership(newOwner)` then `acceptOwnership()` from `newOwner`.
- Failed ERC20 transfers revert and keep the order reusable.
- `withdrawTokens` is for recovering undistributed inventory only.
- The source is a single Solidity file to simplify BscScan verification.
