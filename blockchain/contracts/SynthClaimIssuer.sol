// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SynthClaimIssuer
 * @dev Dummy claim issuer that validates only topic 100100
 */
contract SynthClaimIssuer is Ownable {
    // Keep authorized identities for backwards compatibility and manual overrides
    mapping(address => bool) public authorizedIdentities;

    constructor() Ownable() {}

    /**
     * @dev Authorize an identity contract (SynthIdentity)
     */
    function authorizeIdentity(address identity) external onlyOwner {
        authorizedIdentities[identity] = true;
    }

    /**
     * @dev Remove authorization for an identity contract
     */
    function unauthorizeIdentity(address identity) external onlyOwner {
        authorizedIdentities[identity] = false;
    }

    /**
     * @dev Required by T-REX: Check if a claim is valid
     * DUMMY IMPLEMENTATION: Returns true only for topic 100100
     */
    function isClaimValid(
        address /* identity */,
        uint256 topic,
        bytes memory /* signature */,
        bytes memory /* data */
    ) external pure returns (bool) {
        // Only return true for our dummy topic
        return topic == 100100;
    }

    /**
     * @dev Required by T-REX: Get claim issuer public key
     * Not used in our implementation
     */
    function getRecoveredAddress(
        bytes memory /* signature */,
        bytes32 /* dataHash */
    ) external pure returns (address) {
        return address(0);
    }
}
