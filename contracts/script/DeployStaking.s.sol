// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/DracmaStaking.sol";

/**
 * @title DeployStaking
 * @dev Deploya el contrato de staking de DRACMA en BSC Mainnet.
 *
 *      Después del deploy:
 *        1. Aprobar DRACMA tokens para el contrato de staking
 *        2. Llamar fundRewardPool(amount) para financiar recompensas
 *        3. Actualizar STAKING_ADDRESS en src/config/contracts.ts
 */
contract DeployStaking is Script {
    function run() external {
        // ─── Direcciones BSC Mainnet ─────────────────────────────────────
        address dracmaToken = 0x8A9f07fdBc75144C9207373597136c6E280A872D;

        // ─── Parámetros ─────────────────────────────────────────────────
        uint256 initialAprBasisPoints = 1000; // 10% APR

        // ─── Deploy ─────────────────────────────────────────────────────
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        DracmaStaking staking = new DracmaStaking(
            dracmaToken,
            initialAprBasisPoints
        );

        console.log("DracmaStaking deployed at:", address(staking));
        console.log("");
        console.log("=== DEPLOY COMPLETO ===");
        console.log("Staking:", address(staking));
        console.log("");
        console.log("SIGUIENTE PASO:");
        console.log("  1. Aprobar DRACMA tokens para el contrato de staking");
        console.log("  2. Llamar fundRewardPool(amount) para financiar recompensas");
        console.log("  3. Actualizar STAKING_ADDRESS en contracts.ts");

        vm.stopBroadcast();
    }
}
