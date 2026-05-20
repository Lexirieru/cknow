// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./StakeVault.sol";
import "./CknowRegistry.sol";
import "./ValidatorRegistry.sol";

/// @title ChallengeManager — dispute lifecycle: open → vote → resolve
contract ChallengeManager is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    uint256 public constant QUORUM_DEADLINE      = 12 hours;
    uint256 public constant PANEL_SIZE           = 3;
    uint256 public constant QUORUM_THRESHOLD_BPS = 6700;

    uint256 public minChallengerStake;

    enum VoteChoice { uphold, overturn }

    enum ChallengeStatus {
        open, voting, awaiting_quorum, resolved_upheld, resolved_overturned
    }

    struct Challenge {
        bytes32 id;
        bytes32 entryId;
        address challenger;
        address challengeToken;
        uint256 challengerStake;
        string reason;
        string evidenceRef;
        ChallengeStatus status;
        address[] validatorPanel;
        uint256 openedAt;
        uint256 quorumDeadline;
        uint256 resolvedAt;
        address slashedAddress;
        uint256 slashAmount;
        uint256 upholdVotes;
        uint256 overturnVotes;
    }

    StakeVault        public stakeVault;
    CknowRegistry     public registry;
    ValidatorRegistry public validatorRegistry;

    mapping(bytes32 => Challenge) public challenges;
    mapping(bytes32 => mapping(address => bool)) public hasVoted;
    mapping(bytes32 => uint256) public openChallengeCount;
    mapping(address => bool) public authorized;

    event ChallengeOpened(bytes32 indexed challengeId, bytes32 indexed entryId, address challenger, address token, uint256 stake);
    event VoteCast(bytes32 indexed challengeId, address indexed validator, VoteChoice choice);
    event ChallengeResolved(bytes32 indexed challengeId, bool upheld, address slashed, uint256 slashAmount);
    event QuorumEscalated(bytes32 indexed challengeId, uint256 newDeadline);

    error InsufficientStake();
    error ChallengeNotFound();
    error AlreadyVoted();
    error NotOnPanel();
    error NotResolvable();
    error Unauthorized();
    error DeadlineNotPassed();
    error TokenNotAllowed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address _stakeVault,
        address _registry,
        address _validatorRegistry
    ) external initializer {
        __Ownable_init(msg.sender);
        stakeVault        = StakeVault(payable(_stakeVault));
        registry          = CknowRegistry(_registry);
        validatorRegistry = ValidatorRegistry(_validatorRegistry);
        minChallengerStake = 0.001 ether;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    modifier onlyAuthorized() {
        if (!authorized[msg.sender] && msg.sender != owner()) revert Unauthorized();
        _;
    }

    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
    }

    function setMinChallengerStake(uint256 amount) external onlyOwner {
        minChallengerStake = amount;
    }

    function openChallenge(
        bytes32 entryId,
        string calldata reason,
        string calldata evidenceRef,
        address token,
        uint256 stakeAmt
    ) external payable returns (bytes32 challengeId) {
        if (!registry.allowedTokens(token)) revert TokenNotAllowed();

        uint256 actualStake;
        if (token == address(0)) {
            if (msg.value < minChallengerStake) revert InsufficientStake();
            actualStake = msg.value;
        } else {
            require(msg.value == 0, "no CELO for ERC-20");
            if (stakeAmt < minChallengerStake) revert InsufficientStake();
            actualStake = stakeAmt;
        }

        challengeId = keccak256(abi.encodePacked(entryId, msg.sender, block.timestamp));

        address[] memory panel = validatorRegistry.samplePanel(challengeId, PANEL_SIZE);

        challenges[challengeId] = Challenge({
            id: challengeId,
            entryId: entryId,
            challenger: msg.sender,
            challengeToken: token,
            challengerStake: actualStake,
            reason: reason,
            evidenceRef: evidenceRef,
            status: ChallengeStatus.open,
            validatorPanel: panel,
            openedAt: block.timestamp,
            quorumDeadline: block.timestamp + QUORUM_DEADLINE,
            resolvedAt: 0,
            slashedAddress: address(0),
            slashAmount: 0,
            upholdVotes: 0,
            overturnVotes: 0
        });

        if (token == address(0)) {
            stakeVault.lock{value: actualStake}(msg.sender, address(0), actualStake);
        } else {
            stakeVault.lock(msg.sender, token, actualStake);
        }

        openChallengeCount[entryId]++;
        if (openChallengeCount[entryId] >= 3) {
            registry.markContested(entryId, openChallengeCount[entryId]);
        }

        emit ChallengeOpened(challengeId, entryId, msg.sender, token, actualStake);
    }

    function castVote(bytes32 challengeId, VoteChoice choice) external {
        Challenge storage c = challenges[challengeId];
        if (c.challenger == address(0)) revert ChallengeNotFound();
        if (hasVoted[challengeId][msg.sender]) revert AlreadyVoted();

        bool onPanel;
        for (uint256 i = 0; i < c.validatorPanel.length; i++) {
            if (c.validatorPanel[i] == msg.sender) { onPanel = true; break; }
        }
        if (!onPanel) revert NotOnPanel();

        hasVoted[challengeId][msg.sender] = true;
        if (choice == VoteChoice.uphold) c.upholdVotes++;
        else c.overturnVotes++;
        if (c.status == ChallengeStatus.open) c.status = ChallengeStatus.voting;

        emit VoteCast(challengeId, msg.sender, choice);
    }

    function resolveChallenge(bytes32 challengeId) external onlyAuthorized nonReentrant {
        Challenge storage c = challenges[challengeId];
        if (c.challenger == address(0)) revert ChallengeNotFound();
        if (c.status == ChallengeStatus.resolved_upheld ||
            c.status == ChallengeStatus.resolved_overturned) revert NotResolvable();

        uint256 totalVotes = c.upholdVotes + c.overturnVotes;
        bool quorumReached = totalVotes > 0 && (
            (c.upholdVotes   * 10000 / totalVotes >= QUORUM_THRESHOLD_BPS) ||
            (c.overturnVotes * 10000 / totalVotes >= QUORUM_THRESHOLD_BPS)
        );
        if (!quorumReached && block.timestamp < c.quorumDeadline) revert DeadlineNotPassed();

        CknowRegistry.Entry memory entry = registry.getEntry(c.entryId);
        bool upheld = c.upholdVotes >= c.overturnVotes;

        if (upheld) {
            c.status         = ChallengeStatus.resolved_upheld;
            c.slashedAddress = c.challenger;
            c.slashAmount    = c.challengerStake;
            stakeVault.slash(c.challenger, c.challengeToken, entry.submitter, c.challengerStake);
        } else {
            c.status         = ChallengeStatus.resolved_overturned;
            c.slashedAddress = entry.submitter;
            c.slashAmount    = entry.stakeAmount;
            stakeVault.slash(entry.submitter, entry.paymentToken, c.challenger, entry.stakeAmount);
            registry.burnEntry(c.entryId, "overturned by challenge");
            stakeVault.release(c.challenger, c.challengeToken, c.challengerStake);
        }

        c.resolvedAt = block.timestamp;
        if (openChallengeCount[c.entryId] > 0) openChallengeCount[c.entryId]--;

        for (uint256 i = 0; i < c.validatorPanel.length; i++) {
            address v = c.validatorPanel[i];
            if (hasVoted[challengeId][v]) {
                validatorRegistry.updateReputation(v, upheld
                    ? c.upholdVotes >= c.overturnVotes
                    : c.overturnVotes > c.upholdVotes);
            }
        }

        emit ChallengeResolved(challengeId, upheld, c.slashedAddress, c.slashAmount);
    }

    function escalateQuorum(bytes32 challengeId) external onlyAuthorized {
        Challenge storage c = challenges[challengeId];
        if (c.challenger == address(0)) revert ChallengeNotFound();
        if (block.timestamp < c.quorumDeadline) revert DeadlineNotPassed();
        c.status = ChallengeStatus.awaiting_quorum;
        c.quorumDeadline = block.timestamp + 6 hours;
        emit QuorumEscalated(challengeId, c.quorumDeadline);
    }

    function getChallenge(bytes32 challengeId) external view returns (Challenge memory) {
        return challenges[challengeId];
    }

    uint256[40] private __gap;
}
