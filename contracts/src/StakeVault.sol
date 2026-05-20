// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StakeVault — holds staked tokens (native CELO or ERC-20)
/// @dev UUPS upgradeable. address(0) as token = native CELO.
contract StakeVault is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// staker => token => locked amount
    mapping(address => mapping(address => uint256)) public balanceOf;
    mapping(address => bool) public authorized;

    event Locked(address indexed staker, address indexed token, uint256 amount);
    event Slashed(address indexed staker, address indexed token, address indexed recipient, uint256 amount);
    event Released(address indexed staker, address indexed token, uint256 amount);

    error Unauthorized();
    error InsufficientBalance();
    error ValueMismatch();

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

    function lock(address staker, address token, uint256 amount) external payable onlyAuthorized {
        if (token == address(0)) {
            if (msg.value != amount) revert ValueMismatch();
        } else {
            if (msg.value != 0) revert ValueMismatch();
            IERC20(token).safeTransferFrom(staker, address(this), amount);
        }
        balanceOf[staker][token] += amount;
        emit Locked(staker, token, amount);
    }

    function slash(address staker, address token, address recipient, uint256 amount)
        external onlyAuthorized nonReentrant
    {
        if (balanceOf[staker][token] < amount) revert InsufficientBalance();
        balanceOf[staker][token] -= amount;
        _transfer(token, recipient, amount);
        emit Slashed(staker, token, recipient, amount);
    }

    function release(address staker, address token, uint256 amount)
        external onlyAuthorized nonReentrant
    {
        if (balanceOf[staker][token] < amount) revert InsufficientBalance();
        balanceOf[staker][token] -= amount;
        _transfer(token, staker, amount);
        emit Released(staker, token, amount);
    }

    function _transfer(address token, address to, uint256 amount) internal {
        if (token == address(0)) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "StakeVault: CELO transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {}

    uint256[48] private __gap;
}
