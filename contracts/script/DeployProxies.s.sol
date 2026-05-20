// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/StakeVault.sol";
import "../src/ValidatorRegistry.sol";
import "../src/CknowINFT.sol";
import "../src/CknowRegistry.sol";
import "../src/ChallengeManager.sol";
import "../src/RoyaltyVault.sol";
import "../src/CknowMarket.sol";

/// @notice Deploy only the ERC1967 proxies using already-deployed implementations.
///         Run this after implementations are already on-chain.
///
///   forge script script/DeployProxies.s.sol \
///     --rpc-url celo_mainnet \
///     --broadcast \
///     --verify \
///     -vvvv
contract DeployProxies is Script {
    // Implementations already deployed on Celo Mainnet
    address constant STAKE_VAULT_IMPL      = 0xd3260aD9310b7618918c8D6a5fCA9B61a429A989;
    address constant VALIDATOR_IMPL        = 0xc3b5e2188a0185dBc825437f5FAFA1a653afFAF8;
    address constant INFT_IMPL             = 0x6607a970AA0299d324763DC9CEe3cDEC40321fb2;
    address constant REGISTRY_IMPL         = 0x689D35e5c499fE6cA9dcc7355b95E450Be45BA29;
    address constant ROYALTY_IMPL          = 0x0247Aabd4f8665f20Dd5f1a442F8bB15B84aCb20;
    address constant MARKET_IMPL           = 0x9fe62Bf1A1C7bDe8EE40Adb1E3B032a776ebEEbC;
    address constant CHALLENGE_IMPL        = 0x8aE9AfA4388753Da65542fF25869066034Bf9f90;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ─── Deploy proxies with initializer calldata ─────────────────────────

        StakeVault stakeVault = StakeVault(payable(address(new ERC1967Proxy(
            STAKE_VAULT_IMPL,
            abi.encodeCall(StakeVault.initialize, ())
        ))));

        ValidatorRegistry validatorRegistry = ValidatorRegistry(address(new ERC1967Proxy(
            VALIDATOR_IMPL,
            abi.encodeCall(ValidatorRegistry.initialize, ())
        )));

        CknowINFT inft = CknowINFT(address(new ERC1967Proxy(
            INFT_IMPL,
            abi.encodeCall(CknowINFT.initialize, ())
        )));

        CknowRegistry registry = CknowRegistry(address(new ERC1967Proxy(
            REGISTRY_IMPL,
            abi.encodeCall(CknowRegistry.initialize, (address(stakeVault), address(inft)))
        )));

        ChallengeManager challengeManager = ChallengeManager(address(new ERC1967Proxy(
            CHALLENGE_IMPL,
            abi.encodeCall(ChallengeManager.initialize, (
                address(stakeVault),
                address(registry),
                address(validatorRegistry)
            ))
        )));

        RoyaltyVault royaltyVault = RoyaltyVault(payable(address(new ERC1967Proxy(
            ROYALTY_IMPL,
            abi.encodeCall(RoyaltyVault.initialize, ())
        ))));

        CknowMarket market = CknowMarket(address(new ERC1967Proxy(
            MARKET_IMPL,
            abi.encodeCall(CknowMarket.initialize, (address(inft)))
        )));

        // ─── Wire authorizations ──────────────────────────────────────────────

        stakeVault.setAuthorized(address(registry), true);
        stakeVault.setAuthorized(address(challengeManager), true);

        registry.setAuthorized(address(challengeManager), true);
        registry.setAuthorized(deployer, true);

        inft.setAuthorized(address(registry), true);

        validatorRegistry.setAuthorized(address(challengeManager), true);

        royaltyVault.setAuthorized(deployer, true);
        market.setAuthorized(deployer, true);
        challengeManager.setAuthorized(deployer, true);

        vm.stopBroadcast();

        // ─── Log proxy addresses ───────────────────────────────────────────────
        console.log("=== cknow UUPS proxies on Celo Mainnet ===");
        console.log("StakeVault:        ", address(stakeVault));
        console.log("ValidatorRegistry: ", address(validatorRegistry));
        console.log("CknowINFT:         ", address(inft));
        console.log("CknowRegistry:     ", address(registry));
        console.log("ChallengeManager:  ", address(challengeManager));
        console.log("RoyaltyVault:      ", address(royaltyVault));
        console.log("CknowMarket:       ", address(market));
        console.log("---");
        console.log("Implementations (already deployed):");
        console.log("  StakeVault:        ", STAKE_VAULT_IMPL);
        console.log("  ValidatorRegistry: ", VALIDATOR_IMPL);
        console.log("  CknowINFT:         ", INFT_IMPL);
        console.log("  CknowRegistry:     ", REGISTRY_IMPL);
        console.log("  ChallengeManager:  ", CHALLENGE_IMPL);
        console.log("  RoyaltyVault:      ", ROYALTY_IMPL);
        console.log("  CknowMarket:       ", MARKET_IMPL);
        console.log("---");
        console.log(">>> Update frontend/src/constants/contracts.ts with proxy addresses above");
    }
}
