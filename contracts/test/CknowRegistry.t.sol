// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/StakeVault.sol";
import "../src/CknowINFT.sol";
import "../src/CknowRegistry.sol";

contract MockERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint8 public decimals = 18;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowance[from][msg.sender] >= amount, "allowance");
        require(balanceOf[from] >= amount, "balance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }
}

contract CknowRegistryTest is Test {
    StakeVault    stakeVault;
    CknowINFT     inft;
    CknowRegistry registry;
    MockERC20     cusd;

    address alice  = makeAddr("alice");
    address keeper = makeAddr("keeper");

    function setUp() public {
        // Deploy implementations
        StakeVault    vaultImpl    = new StakeVault();
        CknowINFT     inftImpl     = new CknowINFT();
        CknowRegistry registryImpl = new CknowRegistry();

        // Deploy UUPS proxies
        stakeVault = StakeVault(payable(address(new ERC1967Proxy(
            address(vaultImpl),
            abi.encodeCall(StakeVault.initialize, ())
        ))));

        inft = CknowINFT(address(new ERC1967Proxy(
            address(inftImpl),
            abi.encodeCall(CknowINFT.initialize, ())
        )));

        registry = CknowRegistry(address(new ERC1967Proxy(
            address(registryImpl),
            abi.encodeCall(CknowRegistry.initialize, (address(stakeVault), address(inft)))
        )));

        // Wire authorizations
        stakeVault.setAuthorized(address(registry), true);
        registry.setAuthorized(keeper, true);
        inft.setAuthorized(address(registry), true);

        // Mock cUSD and whitelist
        cusd = new MockERC20();
        registry.setAllowedToken(address(cusd), true, 0.01 ether);

        // Fund alice
        vm.deal(alice, 10 ether);
        cusd.mint(alice, 100 ether);
    }

    function test_ProxyIsUpgradeable() public view {
        // Owner should be this test contract (deployer)
        assertEq(registry.owner(), address(this));
        assertEq(stakeVault.owner(), address(this));
        assertEq(inft.owner(), address(this));
    }

    function test_SubmitWithNativeCELO() public {
        vm.prank(alice);
        bytes32 entryId = registry.submit{value: 0.001 ether}(
            "ipfs://QmXxx", "ipfs://QmEmbed", _tags("celo"), CknowRegistry.EntryDomain.factual, address(0), 0
        );
        CknowRegistry.Entry memory e = registry.getEntry(entryId);
        assertEq(e.submitter, alice);
        assertEq(e.paymentToken, address(0));
        assertEq(e.stakeAmount, 0.001 ether);
        assertEq(uint8(e.status), uint8(CknowRegistry.EntryStatus.pending));
        assertEq(stakeVault.balanceOf(alice, address(0)), 0.001 ether);
    }

    function test_SubmitWithCUSD() public {
        vm.startPrank(alice);
        cusd.approve(address(stakeVault), 1 ether);
        bytes32 entryId = registry.submit(
            "ipfs://QmYyy", "ipfs://QmEmbed2", _tags("defi"), CknowRegistry.EntryDomain.observation,
            address(cusd), 0.01 ether
        );
        vm.stopPrank();
        CknowRegistry.Entry memory e = registry.getEntry(entryId);
        assertEq(e.paymentToken, address(cusd));
        assertEq(e.stakeAmount, 0.01 ether);
        assertEq(stakeVault.balanceOf(alice, address(cusd)), 0.01 ether);
    }

    function test_ActivateAfterChallengeWindow() public {
        vm.prank(alice);
        bytes32 entryId = registry.submit{value: 0.001 ether}(
            "ipfs://QmAbc", "ipfs://QmEmbed3", _tags("test"), CknowRegistry.EntryDomain.factual, address(0), 0
        );
        vm.prank(keeper);
        vm.expectRevert(CknowRegistry.ChallengeWindowOpen.selector);
        registry.activateEntry(entryId);

        vm.warp(block.timestamp + 6 minutes);

        vm.prank(keeper);
        registry.activateEntry(entryId);

        CknowRegistry.Entry memory e = registry.getEntry(entryId);
        assertEq(uint8(e.status), uint8(CknowRegistry.EntryStatus.active));
        assertGt(e.inftTokenId, 0);
        assertEq(inft.ownerOf(e.inftTokenId), alice);
    }

    function test_RevertInsufficientStake() public {
        vm.prank(alice);
        vm.expectRevert(CknowRegistry.InsufficientStake.selector);
        registry.submit{value: 0.00001 ether}(
            "ipfs://QmBad", "ipfs://QmBad2", _tags(), CknowRegistry.EntryDomain.factual, address(0), 0
        );
    }

    function test_RevertUnallowedToken() public {
        vm.prank(alice);
        vm.expectRevert(CknowRegistry.TokenNotAllowed.selector);
        registry.submit(
            "ipfs://QmFake", "ipfs://QmFake2", _tags(), CknowRegistry.EntryDomain.factual, makeAddr("fake"), 1 ether
        );
    }

    function test_GetAllEntries() public {
        vm.startPrank(alice);
        registry.submit{value: 0.001 ether}("ipfs://1","ipfs://e1",_tags(),CknowRegistry.EntryDomain.factual,address(0),0);
        registry.submit{value: 0.001 ether}("ipfs://2","ipfs://e2",_tags(),CknowRegistry.EntryDomain.factual,address(0),0);
        vm.stopPrank();
        assertEq(registry.getTotalEntryCount(), 2);
        assertEq(registry.getAllEntries(0, 10).length, 2);
    }

    function _tags(string memory a) internal pure returns (string[] memory t) { t = new string[](1); t[0] = a; }
    function _tags() internal pure returns (string[] memory t) { t = new string[](0); }
}
