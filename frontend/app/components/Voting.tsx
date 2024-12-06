"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  UseWaitForTransactionReceiptReturnType,
} from "wagmi";
import useMultiBaas from "../hooks/useMultiBaas";
import VoteButton from "./VoteButton";
import ProgressBar from "./ProgressBar"

interface VotingProps {
  setTxReceipt: (receipt: UseWaitForTransactionReceiptReturnType['data']) => void;
}

const Voting: React.FC<VotingProps> = ({ setTxReceipt }) => {
  const { getVotes, castVote, clearVote, hasVoted, getUserVotes } = useMultiBaas();
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

  const [votesCount, setVotesCount] = useState<number[]>([]);
  const [currentVoteIndex, setCurrentVoteIndex] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: txReceipt, isLoading: isTxProcessing } =
  useWaitForTransactionReceipt({ hash: txHash });

  // Wrap fetchVotes with useCallback
  const fetchVotes = useCallback(async () => {
    try {
      const votesArray = await getVotes();
      if (votesArray) {
        setVotesCount(votesArray.map((vote) => parseInt(vote)));
      }
    } catch (e) {
      console.error("Error fetching votes:", e);
    }
  }, [getVotes]);

  // Wrap checkUserVote with useCallback
  const checkUserVote = useCallback(async () => {
    if (address) {
      try {
        const hasVotedResult = await hasVoted(address);
        if (hasVotedResult) {
          const userVoteIndex = await getUserVotes(address);
          if (userVoteIndex !== null) {
            setCurrentVoteIndex(parseInt(userVoteIndex));
          } else {
            setCurrentVoteIndex(null);
          }
        } else {
          setCurrentVoteIndex(null);
        }
      } catch (e) {
        console.error("Error checking user vote:", e);
      }
    }
  }, [address, hasVoted, getUserVotes]);

  useEffect(() => {
    if (isConnected) {
      fetchVotes();
      checkUserVote();
    }
  }, [isConnected, txReceipt, fetchVotes, checkUserVote]);

  useEffect(() => {
    if (txReceipt) {
      setTxReceipt(txReceipt);
    }
  }, [txReceipt, setTxReceipt]);

  const handleVote = async (index: number) => {
    setLoading(true);
    try {
      const tx =
        currentVoteIndex === index
          ? await clearVote()
          : await castVote(index.toString());
      const hash = await sendTransactionAsync(tx);
      setTxHash(hash);
    } catch (e) {
      setError(`Error casting a vote: ${e}`)
      setTimeout(() => {
        setError(null)
      }, 3000)
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Cast your vote</h1>
      {!isConnected ? (
        <div className="text-center">Please connect your wallet to vote</div>
      ) : (
        <div className="spinner-parent">
          {votesCount.map((voteCount, index) => (
            <VoteButton
              key={index}
              index={index}
              voteCount={voteCount}
              isActive={index === currentVoteIndex}
              isDisabled={isTxProcessing}
              handleVote={handleVote}
            />
          ))}
          {isTxProcessing && (
            <div className="overlay">
              <div className="spinner"></div>
            </div>
          )}
        </div>
      )}
      {loading && (
        <ProgressBar />
      )}
      {error && <div className="text-center font-bold text-red-500">{error}</div>}
    </div>
  
  );
};

export default Voting;
