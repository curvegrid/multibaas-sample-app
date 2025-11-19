// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IModule {
    event ComplianceBound(address indexed _compliance);
    event ComplianceUnbound(address indexed _compliance);

    function bindCompliance(address _compliance) external;
    function unbindCompliance(address _compliance) external;
    function moduleTransferAction(
        address _from,
        address _to,
        uint256 _value
    ) external;
    function moduleMintAction(address _to, uint256 _value) external;
    function moduleBurnAction(address _from, uint256 _value) external;
    function moduleCheck(
        address _from,
        address _to,
        uint256 _value,
        address _compliance
    ) external view returns (bool);
    function isComplianceBound(
        address _compliance
    ) external view returns (bool);
    function canComplianceBind(
        address _compliance
    ) external view returns (bool);
    function isPlugAndPlay() external pure returns (bool);
    function name() external pure returns (string memory _name);
}

/**
 * @title SBTComplianceModule
 * @dev Compliance module that requires the recipient (_to) to hold an SBT to receive tokens
 */
contract SBTComplianceModule is IModule {
    /// compliance contract binding status
    mapping(address => bool) private _complianceBound;

    /// The SBT contract that recipients must hold
    IERC721 public immutable sbtContract;

    /**
     * @dev Throws an exception if `_compliance` is not a bound compliance contract address.
     */
    modifier onlyBoundCompliance(address _compliance) {
        require(_complianceBound[_compliance], "compliance not bound");
        _;
    }

    /**
     * @dev Throws an exception if called from an address that is not a bound compliance contract.
     */
    modifier onlyComplianceCall() {
        require(_complianceBound[msg.sender], "only bound compliance can call");
        _;
    }

    constructor(address _sbtContract) {
        require(
            _sbtContract != address(0),
            "SBT contract cannot be zero address"
        );
        sbtContract = IERC721(_sbtContract);
    }

    /**
     * @dev See {IModule-bindCompliance}.
     */
    function bindCompliance(address _compliance) external override {
        require(_compliance != address(0), "invalid argument - zero address");
        require(!_complianceBound[_compliance], "compliance already bound");
        require(msg.sender == _compliance, "only compliance contract can call");
        _complianceBound[_compliance] = true;
        emit ComplianceBound(_compliance);
    }

    /**
     * @dev See {IModule-unbindCompliance}.
     */
    function unbindCompliance(address _compliance) external override {
        require(_compliance != address(0), "invalid argument - zero address");
        require(_complianceBound[_compliance], "compliance not bound");
        require(msg.sender == _compliance, "only compliance contract can call");
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }

    /**
     * @dev See {IModule-moduleTransferAction}.
     * No action needed for SBT compliance - just check at transfer time
     */
    function moduleTransferAction(
        address /* _from */,
        address /* _to */,
        uint256 /* _value */
    ) external override onlyComplianceCall {
        // No state updates needed for SBT compliance
    }

    /**
     * @dev See {IModule-moduleMintAction}.
     */
    function moduleMintAction(
        address /* _to */,
        uint256 /* _value */
    ) external override onlyComplianceCall {
        // No state updates needed for SBT compliance
    }

    /**
     * @dev See {IModule-moduleBurnAction}.
     */
    function moduleBurnAction(
        address /* _from */,
        uint256 /* _value */
    ) external override onlyComplianceCall {
        // No state updates needed for SBT compliance
    }

    /**
     * @dev See {IModule-moduleCheck}.
     * Checks if the recipient (_to) holds the required SBT
     */
    function moduleCheck(
        address /* _from */,
        address _to,
        uint256 /* _value */,
        address _compliance
    ) external view override onlyBoundCompliance(_compliance) returns (bool) {
        // Recipient must hold the SBT to receive tokens
        return sbtContract.balanceOf(_to) > 0;
    }

    /**
     * @dev See {IModule-isComplianceBound}.
     */
    function isComplianceBound(
        address _compliance
    ) external view override returns (bool) {
        return _complianceBound[_compliance];
    }

    /**
     * @dev See {IModule-canComplianceBind}.
     */
    function canComplianceBind(
        address _compliance
    ) external pure override returns (bool) {
        return _compliance != address(0);
    }

    /**
     * @dev See {IModule-isPlugAndPlay}.
     */
    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    /**
     * @dev See {IModule-name}.
     */
    function name() external pure override returns (string memory _name) {
        return "SBTComplianceModule";
    }
}
