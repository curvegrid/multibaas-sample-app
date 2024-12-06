// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SimpleVoting {
    ISemaphore public semaphore;
    bytes32 private secretCodeHash;
    uint256 public groupId;
    uint256 public numChoices;
    uint256[] public voteCounts; // Indices from 0 to numChoices - 1

    mapping(address => uint256) public votes; // voter => choice index
    mapping(address => bool) public hasVoted;

    event Voted(address indexed voter, uint256 choice, int8 quantity);
    event Log(string title, string message);
    
    constructor(uint256 _numChoices, address semaphoreAddress, bytes32 _secretCodeHash) {
        require(_numChoices > 0, "Number of choices must be greater than zero");
        numChoices = _numChoices;
        voteCounts = new uint256[](numChoices);
        secretCodeHash = _secretCodeHash;
        semaphore = ISemaphore(semaphoreAddress);
        groupId = semaphore.createGroup();
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint256 value = uint256(_bytes32);
        return Strings.toHexString(value, 32);
    }

    function joinGroup(string calldata secretCodeInput, uint256 identityCommitment) external {
        bytes32 inputHash = keccak256(abi.encodePacked(secretCodeInput));
        emit Log('joinGroup inputHash', bytes32ToString(inputHash));
        require(inputHash == secretCodeHash, "Invalid secret word");
        semaphore.addMember(groupId, identityCommitment);
    }

    function vote(
        uint256 merkleTreeDepth,
        uint256 merkleTreeRoot,
        uint256 nullifier,
        uint256 choice,
        uint256[8] calldata points
    ) public {
        require(choice < numChoices, "Invalid choice");

        ISemaphore.SemaphoreProof memory proof = ISemaphore.SemaphoreProof(
            merkleTreeDepth,
            merkleTreeRoot,
            nullifier,
            choice,
            groupId,
            points
        );
        
        semaphore.validateProof(groupId, proof);

        if (!hasVoted[msg.sender]) {
            // New voter
            votes[msg.sender] = choice;
            voteCounts[choice] += 1;
            hasVoted[msg.sender] = true;
            emit Voted(msg.sender, choice, 1);
        } else {
            // Voter changing their vote
            uint256 oldChoice = votes[msg.sender];
            voteCounts[oldChoice] -= 1;
            emit Voted(msg.sender, oldChoice, -1);

            votes[msg.sender] = choice;
            voteCounts[choice] += 1;
            emit Voted(msg.sender, choice, 1);
        }

    }

    function clearVote() public {
        require(hasVoted[msg.sender], "No vote to clear");

        uint256 oldChoice = votes[msg.sender];
        voteCounts[oldChoice] -= 1;
        emit Voted(msg.sender, oldChoice, -1);

        hasVoted[msg.sender] = false;
        delete votes[msg.sender];
    }

    function getVotes() public view returns (uint256[] memory) {
        return voteCounts;
    }
}
