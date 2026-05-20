// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC7857.sol";

/// @title CknowINFT — ERC-7857 iNFT representing a verified knowledge entry on Celo
contract CknowINFT is Initializable, ERC721Upgradeable, OwnableUpgradeable, UUPSUpgradeable, IERC7857 {
    uint256 private _nextTokenId;

    mapping(uint256 => IntelligentData[]) private _intelligentData;
    mapping(uint256 => string) private _encryptedURIs;
    mapping(uint256 => mapping(address => bytes)) private _authorizations;
    mapping(address => bool) public authorized;

    error Unauthorized();
    error NotOwner();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize() external initializer {
        __ERC721_init("cknow iNFT", "CKN-iNFT");
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

    function mint(
        IntelligentData[] calldata data,
        address to,
        string calldata encryptedURI
    ) external onlyAuthorized returns (uint256 tokenId) {
        tokenId = ++_nextTokenId;
        _safeMint(to, tokenId);
        for (uint256 i = 0; i < data.length; i++) {
            _intelligentData[tokenId].push(data[i]);
        }
        _encryptedURIs[tokenId] = encryptedURI;
        emit IntelligentDataMinted(tokenId, to, data);
    }

    function authorizeUsage(uint256 tokenId, address executor, bytes calldata permissions) external {
        if (ownerOf(tokenId) != msg.sender && !authorized[msg.sender] && msg.sender != owner()) revert NotOwner();
        _authorizations[tokenId][executor] = permissions;
        emit UsageAuthorized(tokenId, executor);
    }

    function burn(uint256 tokenId) external onlyAuthorized {
        _burn(tokenId);
        delete _intelligentData[tokenId];
        delete _encryptedURIs[tokenId];
        emit IntelligentDataBurned(tokenId);
    }

    function getIntelligentData(uint256 tokenId) external view returns (IntelligentData[] memory) {
        return _intelligentData[tokenId];
    }

    function getEncryptedURI(uint256 tokenId) external view returns (string memory) {
        return _encryptedURIs[tokenId];
    }

    function getAuthorization(uint256 tokenId, address executor) external view returns (bytes memory) {
        return _authorizations[tokenId][executor];
    }

    uint256[44] private __gap;
}
