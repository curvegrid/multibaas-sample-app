// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SampleSBT
 * @dev Sample Soul Bound Token (SBT) for testing SynthIdentity
 */
contract SampleSBT is ERC721, Ownable {
    error SoulBoundToken();

    uint256 private _tokenIdCounter;

    // Mapping to track if transfers are disabled (soul bound)
    mapping(uint256 => bool) public soulBound;

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable() {}

    /**
     * @dev Mint a soul bound token to a user
     */
    function mintSBT(address to) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _mint(to, tokenId);
        soulBound[tokenId] = true; // Mark as soul bound

        return tokenId;
    }

    /**
     * @dev Override transfer functions to prevent transfers of soul bound tokens
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        if (soulBound[tokenId]) {
            revert SoulBoundToken();
        }
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override {
        if (soulBound[tokenId]) {
            revert SoulBoundToken();
        }
        super.safeTransferFrom(from, to, tokenId, data);
    }

    /**
     * @dev Burn a soul bound token (only owner can burn)
     */
    function burnSBT(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
        delete soulBound[tokenId];
    }
}
