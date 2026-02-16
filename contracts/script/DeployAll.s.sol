// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/FixedPricePresale.sol";
import "../src/VestingVault.sol";

/**
 * @title DeployAll
 * @dev Deploya FixedPricePresale + VestingVault y los conecta.
 *
 *      Orden:
 *        1. Deploy FixedPricePresale
 *        2. Deploy VestingVault (apunta al presale)
 *        3. presale.setVestingVault(vault)
 *
 *      Después del deploy:
 *        - Transferir tokens DRACMA al presale (para las ventas)
 *        - Actualizar las direcciones en src/config/contracts.ts
 */
contract DeployAll is Script {
    function run() external {
        // ─── Direcciones BSC Mainnet ─────────────────────────────────────
        address saleToken       = 0x8A9f07fdBc75144C9207373597136c6E280A872D; // DRACMA
        address usdt            = 0x55d398326f99059fF775485246999027B3197955;
        address usdc            = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
        address wbnb            = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
        address ownerWallet     = 0xbf646CD04B14eb9159d2000e73C4C339A3C980d9;
        address liquidityWallet = 0x745A5680B16547177D0EF5f0B0e9B0F2BFe4Bd3a;
        address stakingWallet   = 0x7B732b87471736a64EbF9D7e1e327AC8519D7C96;
        address adminWallet     = 0xbf646CD04B14eb9159d2000e73C4C339A3C980d9;

        // ─── Parámetros de preventa ──────────────────────────────────────
        uint256 initialPrice     = 0.2e18;   // $0.20 USD
        uint256 secondPhasePrice = 0.5e18;   // $0.50 USD
        uint256 presaleDays      = 120;       // duración total preventa
        uint256 priceChangeDays  = 30;        // cambio de precio a los 30 días

        // ─── Parámetros de vesting ───────────────────────────────────────
        uint256 vestingStartTimestamp = block.timestamp + (presaleDays * 1 days); // inicia cuando termina la preventa
        uint256 vestingDurationDays   = 180;  // 6 meses de vesting lineal

        // ─── Deploy ──────────────────────────────────────────────────────
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy FixedPricePresale
        FixedPricePresale presale = new FixedPricePresale(
            saleToken,
            usdt,
            usdc,
            wbnb,
            ownerWallet,
            liquidityWallet,
            stakingWallet,
            adminWallet,
            initialPrice,
            secondPhasePrice,
            presaleDays,
            priceChangeDays
        );
        console.log("FixedPricePresale deployed at:", address(presale));

        // 2. Deploy VestingVault (apunta al presale)
        VestingVault vault = new VestingVault(
            saleToken,
            address(presale),
            vestingStartTimestamp,
            vestingDurationDays
        );
        console.log("VestingVault deployed at:", address(vault));

        // 3. Conectar vault al presale
        presale.setVestingVault(address(vault));
        console.log("VestingVault linked to presale");

        console.log("");
        console.log("=== DEPLOY COMPLETO ===");
        console.log("Presale:", address(presale));
        console.log("Vault:  ", address(vault));
        console.log("");
        console.log("SIGUIENTE PASO:");
        console.log("  1. Transferir tokens DRACMA al presale");
        console.log("  2. Actualizar PRESALE_CONTRACT_ADDRESS en contracts.ts");
        console.log("  3. Actualizar VESTING_VAULT_ADDRESS en contracts.ts");

        vm.stopBroadcast();
    }
}
