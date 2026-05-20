// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title CknowMarket — escrow marketplace for iNFT trading on Celo
/// @dev Sellers choose payment token (CELO native or any ERC-20).
contract CknowMarket is Initializable, OwnableUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Listing {
        address seller;
        address paymentToken;
        uint256 price;
        bool    active;
    }

    IERC721 public inft;

    mapping(uint256 => Listing) public listings;
    uint256[] private _listedTokenIds;
    mapping(address => bool) public authorized;

    event Listed(uint256 indexed tokenId, address indexed seller, address paymentToken, uint256 price);
    event Sold(uint256 indexed tokenId, address indexed buyer, address indexed seller, address paymentToken, uint256 price);
    event Cancelled(uint256 indexed tokenId, address indexed seller);
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);

    modifier onlyAuthorized() {
        require(authorized[msg.sender] || msg.sender == owner(), "not authorized");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address inftAddress) external initializer {
        __Ownable_init(msg.sender);
        inft = IERC721(inftAddress);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setAuthorized(address account, bool status) external onlyOwner {
        authorized[account] = status;
    }

    function list(uint256 tokenId, address paymentToken, uint256 price) external {
        require(inft.ownerOf(tokenId) == msg.sender, "not owner");
        require(price > 0, "price must be > 0");
        inft.transferFrom(msg.sender, address(this), tokenId);
        _addListing(tokenId, msg.sender, paymentToken, price);
    }

    function listFor(uint256 tokenId, address seller, address paymentToken, uint256 price) external onlyAuthorized {
        if (inft.ownerOf(tokenId) == seller) {
            inft.transferFrom(seller, address(this), tokenId);
        } else {
            require(inft.ownerOf(tokenId) == address(this), "not owned");
        }
        require(price > 0, "price must be > 0");
        _addListing(tokenId, seller, paymentToken, price);
    }

    function _addListing(uint256 tokenId, address seller, address paymentToken, uint256 price) internal {
        if (!listings[tokenId].active) _listedTokenIds.push(tokenId);
        listings[tokenId] = Listing({ seller: seller, paymentToken: paymentToken, price: price, active: true });
        emit Listed(tokenId, seller, paymentToken, price);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        _executeBuy(tokenId, msg.sender);
    }

    function buyFor(uint256 tokenId, address recipient) external payable onlyAuthorized nonReentrant {
        _executeBuy(tokenId, recipient);
    }

    function _executeBuy(uint256 tokenId, address recipient) internal {
        Listing storage l = listings[tokenId];
        require(l.active, "not listed");
        address seller = l.seller;
        address token  = l.paymentToken;
        uint256 price  = l.price;
        l.active = false;

        if (token == address(0)) {
            require(msg.value >= price, "insufficient CELO");
            inft.transferFrom(address(this), recipient, tokenId);
            (bool ok,) = seller.call{value: price}("");
            require(ok, "CELO transfer failed");
            if (msg.value > price) {
                (bool refund,) = msg.sender.call{value: msg.value - price}("");
                require(refund, "refund failed");
            }
        } else {
            require(msg.value == 0, "no CELO for ERC-20 listing");
            IERC20(token).safeTransferFrom(msg.sender, seller, price);
            inft.transferFrom(address(this), recipient, tokenId);
        }

        emit Sold(tokenId, recipient, seller, token, price);
    }

    function updatePrice(uint256 tokenId, uint256 newPrice) external {
        Listing storage l = listings[tokenId];
        require(l.active, "not listed");
        require(l.seller == msg.sender || authorized[msg.sender] || msg.sender == owner(), "not seller");
        require(newPrice > 0, "price must be > 0");
        l.price = newPrice;
        emit PriceUpdated(tokenId, newPrice);
    }

    function cancel(uint256 tokenId) external {
        Listing storage l = listings[tokenId];
        require(l.active, "not listed");
        require(l.seller == msg.sender || authorized[msg.sender] || msg.sender == owner(), "not seller");
        address seller = l.seller;
        l.active = false;
        inft.transferFrom(address(this), seller, tokenId);
        emit Cancelled(tokenId, seller);
    }

    function getActiveListings() external view returns (uint256[] memory tokenIds, Listing[] memory lst) {
        uint256 count;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            if (listings[_listedTokenIds[i]].active) count++;
        }
        tokenIds = new uint256[](count);
        lst      = new Listing[](count);
        uint256 j;
        for (uint256 i = 0; i < _listedTokenIds.length; i++) {
            uint256 tid = _listedTokenIds[i];
            if (listings[tid].active) { tokenIds[j] = tid; lst[j] = listings[tid]; j++; }
        }
    }

    uint256[47] private __gap;
}
