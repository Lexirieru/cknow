// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title ValidatorRegistry — validator tiers, reputation, and panel sampling
contract ValidatorRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    enum ValidatorTier { bronze, silver, gold, expert }

    struct Validator {
        string handle;
        ValidatorTier tier;
        uint256 totalVotes;
        uint256 correctVotes;
        uint256 totalEarned;
        uint256 registeredAt;
        bool registered;
    }

    mapping(address => Validator) public validators;
    address[] private _validatorList;
    mapping(address => bool) public authorized;

    event ValidatorRegistered(address indexed validator, string handle);
    event ReputationUpdated(address indexed validator, ValidatorTier newTier, uint256 accuracyBps);

    error AlreadyRegistered();
    error NotRegistered();
    error Unauthorized();

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

    function register(string calldata handle) external {
        if (validators[msg.sender].registered) revert AlreadyRegistered();
        validators[msg.sender] = Validator({
            handle: handle,
            tier: ValidatorTier.bronze,
            totalVotes: 0,
            correctVotes: 0,
            totalEarned: 0,
            registeredAt: block.timestamp,
            registered: true
        });
        _validatorList.push(msg.sender);
        emit ValidatorRegistered(msg.sender, handle);
    }

    function updateReputation(address validator, bool correct) external onlyAuthorized {
        Validator storage v = validators[validator];
        if (!v.registered) revert NotRegistered();
        v.totalVotes++;
        if (correct) v.correctVotes++;
        ValidatorTier newTier = _computeTier(v.totalVotes, v.correctVotes);
        if (newTier != v.tier) v.tier = newTier;
        uint256 accuracy = v.totalVotes == 0 ? 0 : (v.correctVotes * 10000) / v.totalVotes;
        emit ReputationUpdated(validator, v.tier, accuracy);
    }

    function samplePanel(bytes32 seed, uint256 size) external view returns (address[] memory panel) {
        uint256 n = _validatorList.length;
        if (n == 0 || size == 0) return new address[](0);
        if (size > n) size = n;

        uint256[] memory weights = new uint256[](n);
        uint256 totalWeight;
        for (uint256 i = 0; i < n; i++) {
            weights[i] = _tierWeight(validators[_validatorList[i]].tier);
            totalWeight += weights[i];
        }

        panel = new address[](size);
        bool[] memory picked = new bool[](n);
        uint256 count;
        for (uint256 attempt = 0; count < size && attempt < n * 3; attempt++) {
            uint256 rand = uint256(keccak256(abi.encodePacked(seed, attempt))) % totalWeight;
            uint256 cumulative;
            for (uint256 i = 0; i < n; i++) {
                if (picked[i]) continue;
                cumulative += weights[i];
                if (rand < cumulative) {
                    panel[count++] = _validatorList[i];
                    picked[i] = true;
                    totalWeight -= weights[i];
                    break;
                }
            }
        }
    }

    function getTier(address validator) external view returns (ValidatorTier) {
        return validators[validator].tier;
    }

    function validatorCount() external view returns (uint256) {
        return _validatorList.length;
    }

    function _computeTier(uint256 total, uint256 correct) internal pure returns (ValidatorTier) {
        if (total < 10) return ValidatorTier.bronze;
        uint256 acc = (correct * 10000) / total;
        if (total >= 200 && acc >= 8500) return ValidatorTier.expert;
        if (total >= 50  && acc >= 7500) return ValidatorTier.gold;
        if (total >= 10  && acc >= 6500) return ValidatorTier.silver;
        return ValidatorTier.bronze;
    }

    function _tierWeight(ValidatorTier tier) internal pure returns (uint256) {
        if (tier == ValidatorTier.expert) return 8;
        if (tier == ValidatorTier.gold)   return 4;
        if (tier == ValidatorTier.silver) return 2;
        return 1;
    }

    uint256[48] private __gap;
}
