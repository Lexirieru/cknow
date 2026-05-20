// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title RoyaltyVault — accumulates query fees, distributes royalties to contributors
/// @dev Supports native CELO (address(0)) and ERC-20 tokens (USDm, USDC, USDT…).
contract RoyaltyVault is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// contributor => token => claimable amount
    mapping(address => mapping(address => uint256)) public claimable;
    mapping(address => uint256) public totalPending;
    mapping(address => bool) public authorized;

    event FeesDeposited(address indexed token, uint256 amount, uint256 recipientCount);
    event Claimed(address indexed contributor, address indexed token, uint256 amount);
    event Distributed(address indexed token, uint256 totalAmount, uint256 recipientCount);

    error Unauthorized();
    error NothingToClaim();
    error LengthMismatch();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyAuthorized() {
        if (!authorized[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }

    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
    }

    /// @notice Deposit native CELO query fees split across contributors.
    function depositQueryFee(
        address[] calldata contributors,
        uint256[] calldata shares
    ) external payable onlyAuthorized {
        if (contributors.length != shares.length) revert LengthMismatch();
        uint256 total = msg.value;
        uint256 distributed;
        for (uint256 i = 0; i < contributors.length; i++) {
            uint256 amount = i == contributors.length - 1
                ? total - distributed
                : (total * shares[i]) / 10000;
            claimable[contributors[i]][address(0)] += amount;
            distributed += amount;
        }
        totalPending[address(0)] += total;
        emit FeesDeposited(address(0), total, contributors.length);
    }

    /// @notice Deposit ERC-20 query fees. Caller must have approved this contract.
    function depositERC20QueryFee(
        address token,
        uint256 totalAmount,
        address[] calldata contributors,
        uint256[] calldata shares
    ) external onlyAuthorized {
        if (contributors.length != shares.length) revert LengthMismatch();
        require(token != address(0), "use depositQueryFee for CELO");
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);
        uint256 distributed;
        for (uint256 i = 0; i < contributors.length; i++) {
            uint256 amount = i == contributors.length - 1
                ? totalAmount - distributed
                : (totalAmount * shares[i]) / 10000;
            claimable[contributors[i]][token] += amount;
            distributed += amount;
        }
        totalPending[token] += totalAmount;
        emit FeesDeposited(token, totalAmount, contributors.length);
    }

    /// @notice Bulk flush claimable balances for a token. Called by keeper.
    function distribute(address token, address[] calldata recipients) external onlyAuthorized nonReentrant {
        uint256 count;
        uint256 totalOut;
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 amount = claimable[recipients[i]][token];
            if (amount == 0) continue;
            claimable[recipients[i]][token] = 0;
            totalPending[token] -= amount;
            totalOut += amount;
            count++;
            _transfer(token, recipients[i], amount);
        }
        emit Distributed(token, totalOut, count);
    }

    /// @notice Contributor self-claims for a specific token.
    function claim(address token) external nonReentrant {
        uint256 amount = claimable[msg.sender][token];
        if (amount == 0) revert NothingToClaim();
        claimable[msg.sender][token] = 0;
        totalPending[token] -= amount;
        _transfer(token, msg.sender, amount);
        emit Claimed(msg.sender, token, amount);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {}

    uint256[47] private __gap;
}
