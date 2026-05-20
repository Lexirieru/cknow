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

/// @notice Deploy cknow UUPS upgradeable contracts to Celo Mainnet.
///
///   forge script script/Deploy.s.sol \
///     --rpc-url celo_mainnet \
///     --broadcast \
///     --verify \
///     -vvvv
///
/// Required env vars:
///   DEPLOYER_PRIVATE_KEY  — deployer private key
///   CELOSCAN_API_KEY      — https://celoscan.io/myapikey
///
/// After deploy:
///   1. Copy logged addresses to frontend/src/constants/contracts.ts
///   2. Whitelist tokens via setAllowedToken() from admin panel or cast
contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ─── Deploy implementations ───────────────────────────────────────────

        StakeVault        vaultImpl     = new StakeVault();
        ValidatorRegistry validatorImpl = new ValidatorRegistry();
        CknowINFT         inftImpl      = new CknowINFT();
        CknowRegistry     registryImpl  = new CknowRegistry();
        RoyaltyVault      royaltyImpl   = new RoyaltyVault();
        CknowMarket       marketImpl    = new CknowMarket();
        // ChallengeManager deployed after registry proxy address is known
        ChallengeManager  challengeImpl = new ChallengeManager();

        // ─── Deploy proxies with initializer calldata ─────────────────────────

        StakeVault stakeVault = StakeVault(payable(address(new ERC1967Proxy(
            address(vaultImpl),
            abi.encodeCall(StakeVault.initialize, ())
        ))));

        ValidatorRegistry validatorRegistry = ValidatorRegistry(address(new ERC1967Proxy(
            address(validatorImpl),
            abi.encodeCall(ValidatorRegistry.initialize, ())
        )));

        CknowINFT inft = CknowINFT(address(new ERC1967Proxy(
            address(inftImpl),
            abi.encodeCall(CknowINFT.initialize, ())
        )));

        CknowRegistry registry = CknowRegistry(address(new ERC1967Proxy(
            address(registryImpl),
            abi.encodeCall(CknowRegistry.initialize, (address(stakeVault), address(inft)))
        )));

        ChallengeManager challengeManager = ChallengeManager(address(new ERC1967Proxy(
            address(challengeImpl),
            abi.encodeCall(ChallengeManager.initialize, (
                address(stakeVault),
                address(registry),
                address(validatorRegistry)
            ))
        )));

        RoyaltyVault royaltyVault = RoyaltyVault(payable(address(new ERC1967Proxy(
            address(royaltyImpl),
            abi.encodeCall(RoyaltyVault.initialize, ())
        ))));

        CknowMarket market = CknowMarket(address(new ERC1967Proxy(
            address(marketImpl),
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

        // ─── Log proxy addresses (copy to frontend/src/constants/contracts.ts) ─
        console.log("=== cknow UUPS proxies on Celo Mainnet ===");
        console.log("StakeVault:        ", address(stakeVault));
        console.log("ValidatorRegistry: ", address(validatorRegistry));
        console.log("CknowINFT:         ", address(inft));
        console.log("CknowRegistry:     ", address(registry));
        console.log("ChallengeManager:  ", address(challengeManager));
        console.log("RoyaltyVault:      ", address(royaltyVault));
        console.log("CknowMarket:       ", address(market));
        console.log("---");
        console.log("Implementations:");
        console.log("  StakeVault impl:        ", address(vaultImpl));
        console.log("  ValidatorRegistry impl: ", address(validatorImpl));
        console.log("  CknowINFT impl:         ", address(inftImpl));
        console.log("  CknowRegistry impl:     ", address(registryImpl));
        console.log("  ChallengeManager impl:  ", address(challengeImpl));
        console.log("  RoyaltyVault impl:      ", address(royaltyImpl));
        console.log("  CknowMarket impl:       ", address(marketImpl));
        console.log("---");
        console.log(">>> Update frontend/src/constants/contracts.ts with proxy addresses above");
    }
}
