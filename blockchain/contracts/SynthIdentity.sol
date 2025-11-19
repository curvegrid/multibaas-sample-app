// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title SynthIdentity
 * @dev Synthetic OnChain ID that provides ERC-735 claims based on ERC-721 SBT ownership
 */
contract SynthIdentity {
    error UnsupportedOperation(string operation);

    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    address public immutable controller;
    IERC721 public immutable sbt;
    uint256 public immutable topic;
    address public immutable virtualIssuer;
    string public uri;

    bytes32 public immutable claimId;

    constructor(
        address _controller,
        address _sbt,
        uint256 _topic,
        address _virtualIssuer,
        string memory _uri
    ) {
        controller = _controller;
        sbt = IERC721(_sbt);
        topic = _topic;
        virtualIssuer = _virtualIssuer;
        uri = _uri;

        // Generate deterministic claim ID
        claimId = keccak256(abi.encode(_virtualIssuer, _topic));
    }

    /**
     * @dev Returns claim IDs for a given topic
     * DUMMY IMPLEMENTATION: Returns claim only for topic 100100
     */
    function getClaimIdsByTopic(
        uint256 _topic
    ) external view returns (bytes32[] memory) {
        bytes32[] memory claims;

        // Only return claim for our dummy KYC topic 100100
        if (_topic == 100100) {
            claims = new bytes32[](1);
            claims[0] = keccak256(abi.encode(virtualIssuer, 100100));
        } else {
            claims = new bytes32[](0);
        }

        return claims;
    }

    /**
     * @dev Returns a specific claim by ID
     * DUMMY IMPLEMENTATION: Returns claim details only for topic 100100
     */
    function getClaim(
        bytes32 _claimId
    )
        external
        view
        returns (
            uint256 _topic,
            uint256 scheme,
            address issuer,
            bytes memory signature,
            bytes memory data,
            string memory _uri
        )
    {
        // Check if this is our dummy claim ID for topic 100100
        bytes32 dummyClaimId = keccak256(abi.encode(virtualIssuer, 100100));

        if (_claimId == dummyClaimId) {
            return (
                100100, // topic
                1, // ECDSA scheme
                virtualIssuer,
                "", // Empty signature
                "", // Empty data
                uri
            );
        } else {
            // Return empty claim
            return (0, 0, address(0), "", "", "");
        }
    }

    /**
     * @dev Check if identity is valid
     * DUMMY IMPLEMENTATION: Always returns true
     */
    function isValid() external pure returns (bool) {
        return true;
    }

    /**
     * @dev Stub functions for ERC-735 compatibility (not implemented)
     */
    function addClaim(
        uint256,
        uint256,
        address,
        bytes calldata,
        bytes calldata,
        string calldata
    ) external pure returns (bytes32) {
        revert UnsupportedOperation("addClaim");
    }

    function removeClaim(bytes32) external pure returns (bool) {
        revert UnsupportedOperation("removeClaim");
    }
}
