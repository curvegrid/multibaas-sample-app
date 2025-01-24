// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleVoting {
    uint256 public numChoices;
    uint256[] public voteCounts; // Indices from 0 to numChoices - 1
    mapping(address => uint256) public votes; // voter => choice index
    mapping(address => bool) public hasVoted;

    event Voted(address indexed voter, uint256 choice, int8 quantity);

    constructor(uint256 _numChoices) {
        require(_numChoices > 0, "Number of choices must be > zero");
        numChoices = _numChoices;
        voteCounts = new uint256[](numChoices); // Initialize vote counts
    }

    function vote(uint256 choice) public {
        require(choice < numChoices, "Invalid choice");

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
