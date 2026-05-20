// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./StakeVault.sol";
import "./interfaces/IERC7857.sol";

/// @title CknowRegistry — entry lifecycle + ERC-7857 iNFT minting on Celo
/// @dev UUPS upgradeable. Supports staking with native CELO or whitelisted ERC-20s.
contract CknowRegistry is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    enum EntryDomain { factual, labeled_example, structured_data, observation, correction }
    enum EntryStatus { pending, active, contested, stale, burned }

    struct Entry {
        bytes32 id;
        string storageRef;    // IPFS CID — AES-256-GCM encrypted blob
        string embeddingRef;  // IPFS CID — embedding vector
        string[] tags;
        EntryDomain domain;
        address submitter;
        address paymentToken; // address(0) = native CELO
        uint256 stakeAmount;
        EntryStatus status;
        uint256 submittedAt;
        uint256 challengeWindowEnd;
        uint256 queryCount;
        uint256 royaltiesEarned;
        uint256 lastQueriedAt;
        uint256 inftTokenId;
    }

    struct UserProfile {
        address royaltyToken;
        string handle;
        uint256 totalEntries;
        uint256 totalQueries;
        uint256 totalRoyalties;
    }

    StakeVault public stakeVault;
    IERC7857   public inftContract;

    mapping(address => uint256) public minStake;
    mapping(address => bool)    public allowedTokens;

    mapping(bytes32 => Entry)       public entries;
    mapping(address => UserProfile) public profiles;
    mapping(address => bool)        public authorized;

    bytes32[]                     private _allEntries;
    mapping(address => bytes32[]) private _submitterEntries;

    uint256 public challengeWindow;

    event EntrySubmitted(bytes32 indexed entryId, address indexed submitter, address paymentToken, uint256 stake);
    event EntryActivated(bytes32 indexed entryId, uint256 inftTokenId);
    event EntryBurned(bytes32 indexed entryId, string reason);
    event EntryContested(bytes32 indexed entryId, uint256 challengeCount);
    event QueryRecorded(bytes32 indexed entryId, uint256 royaltyAmount);
    event ProfileUpdated(address indexed user, address royaltyToken, string handle);
    event TokenConfigured(address indexed token, bool allowed, uint256 minStakeAmount);

    error InsufficientStake();
    error TokenNotAllowed();
    error EntryNotFound();
    error NotPending();
    error NotActive();
    error ChallengeWindowOpen();
    error Unauthorized();
    error ValueMismatch();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _stakeVault, address _inftContract) external initializer {
        __Ownable_init(msg.sender);
        stakeVault   = StakeVault(payable(_stakeVault));
        inftContract = IERC7857(_inftContract);
        challengeWindow = 5 minutes;
        // Native CELO always allowed; min stake = 0.001 CELO
        allowedTokens[address(0)] = true;
        minStake[address(0)] = 0.001 ether;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyAuthorized() {
        if (!authorized[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }

    modifier entryExists(bytes32 entryId) {
        if (entries[entryId].submitter == address(0)) revert EntryNotFound();
        _;
    }

    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
    }

    function setChallengeWindow(uint256 windowSeconds) external onlyOwner {
        challengeWindow = windowSeconds;
    }

    function setAllowedToken(address token, bool allowed, uint256 minAmount) external onlyOwner {
        allowedTokens[token] = allowed;
        minStake[token] = minAmount;
        emit TokenConfigured(token, allowed, minAmount);
    }

    function setProfile(address royaltyToken, string calldata handle) external {
        UserProfile storage p = profiles[msg.sender];
        p.royaltyToken = royaltyToken;
        p.handle       = handle;
        emit ProfileUpdated(msg.sender, royaltyToken, handle);
    }

    function submit(
        string calldata storageRef,
        string calldata embeddingRef,
        string[] calldata tags,
        EntryDomain domain,
        address paymentToken,
        uint256 stakeAmt
    ) external payable returns (bytes32 entryId) {
        if (!allowedTokens[paymentToken]) revert TokenNotAllowed();

        uint256 actualStake;
        if (paymentToken == address(0)) {
            if (msg.value < minStake[address(0)]) revert InsufficientStake();
            if (stakeAmt != 0) revert ValueMismatch();
            actualStake = msg.value;
        } else {
            if (msg.value != 0) revert ValueMismatch();
            if (stakeAmt < minStake[paymentToken]) revert InsufficientStake();
            actualStake = stakeAmt;
        }

        entryId = keccak256(abi.encodePacked(storageRef, msg.sender, block.timestamp));

        entries[entryId] = Entry({
            id: entryId,
            storageRef: storageRef,
            embeddingRef: embeddingRef,
            tags: tags,
            domain: domain,
            submitter: msg.sender,
            paymentToken: paymentToken,
            stakeAmount: actualStake,
            status: EntryStatus.pending,
            submittedAt: block.timestamp,
            challengeWindowEnd: block.timestamp + challengeWindow,
            queryCount: 0,
            royaltiesEarned: 0,
            lastQueriedAt: 0,
            inftTokenId: 0
        });

        _allEntries.push(entryId);
        _submitterEntries[msg.sender].push(entryId);
        profiles[msg.sender].totalEntries++;

        if (paymentToken == address(0)) {
            stakeVault.lock{value: actualStake}(msg.sender, address(0), actualStake);
        } else {
            stakeVault.lock(msg.sender, paymentToken, actualStake);
        }

        emit EntrySubmitted(entryId, msg.sender, paymentToken, actualStake);
    }

    function activateEntry(bytes32 entryId) external onlyAuthorized entryExists(entryId) {
        Entry storage e = entries[entryId];
        if (e.status != EntryStatus.pending) revert NotPending();
        if (block.timestamp < e.challengeWindowEnd) revert ChallengeWindowOpen();

        e.status = EntryStatus.active;

        IERC7857.IntelligentData[] memory iData = new IERC7857.IntelligentData[](1);
        iData[0] = IERC7857.IntelligentData({
            dataDescription: _domainString(e.domain),
            dataHash: keccak256(abi.encodePacked(e.storageRef))
        });
        uint256 tokenId = inftContract.mint(iData, e.submitter, e.storageRef);
        e.inftTokenId = tokenId;

        emit EntryActivated(entryId, tokenId);
    }

    function burnEntry(bytes32 entryId, string calldata reason) external onlyAuthorized entryExists(entryId) {
        Entry storage e = entries[entryId];
        if (e.status == EntryStatus.burned) revert NotActive();
        e.status = EntryStatus.burned;
        if (e.inftTokenId != 0) inftContract.burn(e.inftTokenId);
        emit EntryBurned(entryId, reason);
    }

    function markContested(bytes32 entryId, uint256 challengeCount) external onlyAuthorized entryExists(entryId) {
        Entry storage e = entries[entryId];
        if (e.status != EntryStatus.active) revert NotActive();
        e.status = EntryStatus.contested;
        emit EntryContested(entryId, challengeCount);
    }

    function recordQuery(bytes32 entryId, uint256 royaltyAmount) external onlyAuthorized entryExists(entryId) {
        Entry storage e = entries[entryId];
        e.queryCount++;
        e.royaltiesEarned  += royaltyAmount;
        e.lastQueriedAt     = block.timestamp;
        UserProfile storage p = profiles[e.submitter];
        p.totalQueries++;
        p.totalRoyalties += royaltyAmount;
        emit QueryRecorded(entryId, royaltyAmount);
    }

    function getEntry(bytes32 entryId) external view returns (Entry memory) {
        return entries[entryId];
    }

    function getProfile(address user) external view returns (UserProfile memory) {
        return profiles[user];
    }

    function getAllEntries(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        uint256 total = _allEntries.length;
        if (offset >= total) return new bytes32[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        bytes32[] memory page = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) page[i - offset] = _allEntries[i];
        return page;
    }

    function getTotalEntryCount() external view returns (uint256) {
        return _allEntries.length;
    }

    function getSubmitterEntries(address submitter) external view returns (bytes32[] memory) {
        return _submitterEntries[submitter];
    }

    function _domainString(EntryDomain d) internal pure returns (string memory) {
        if (d == EntryDomain.factual)         return "factual";
        if (d == EntryDomain.labeled_example) return "labeled_example";
        if (d == EntryDomain.structured_data) return "structured_data";
        if (d == EntryDomain.observation)     return "observation";
        return "correction";
    }

    uint256[38] private __gap;
}
