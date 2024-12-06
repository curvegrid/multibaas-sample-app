"use client";
import type { Identity } from "@semaphore-protocol/identity";
import type { PostMethodArgs, MethodCallResponse, TransactionToSignResponse, Event } from "@curvegrid/multibaas-sdk";
import type { SendTransactionParameters } from "@wagmi/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Configuration, ContractsApi, EventsApi, ChainsApi, EventQueriesApi }from "@curvegrid/multibaas-sdk";
import { generateProof as generateSemaphoreProof } from "@semaphore-protocol/proof"
import { useAccount } from "wagmi";
import useSemaphore from "../hooks/useSemaphore";
import { generateMerkleProof } from "../utils/merkelProof";

interface ChainStatus {
  chainID: number;
  blockNumber: number;
}

interface MultiBaasHook {
  joinGroup: (secretCode: string, identity: Identity) => Promise<SendTransactionParameters>;
  checkCommitmentInGroup: (identity: Identity) =>  Promise<MethodCallResponse['output']>;
  getChainStatus: () => Promise<ChainStatus | null>;
  clearVote: () => Promise<SendTransactionParameters>;
  getVotes: () => Promise<string[] | null>;
  hasVoted: (ethAddress: string) => Promise<boolean | null>;
  castVote: (choice: string) => Promise<SendTransactionParameters>;
  getUserVotes: (ethAddress: string) => Promise<string | null>;
  getVotedEvents: () => Promise<Array<Event> | null>;
}

const useMultiBaas = (): MultiBaasHook => {
  const mbBaseUrl = process.env.NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL || "";
  const mbApiKey = process.env.NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY || "";
  const votingContractLabel =
    process.env.NEXT_PUBLIC_MULTIBAAS_VOTING_CONTRACT_LABEL || "";
  const votingAddressLabel =
    process.env.NEXT_PUBLIC_MULTIBAAS_VOTING_ADDRESS_LABEL || "";
  const semaphoreAddress = process.env.NEXT_PUBLIC_MULTIBAAS_SEMAPHORE_ADDRESS || "";
  const semaphoreContractLabel = 'semaphore';
  const semaphoreAddressLabel = 'semaphore';


  const chain = "ethereum";

  const { identity } = useSemaphore();

  // Memoize mbConfig
  const mbConfig = useMemo(() => {
    return new Configuration({
      basePath: new URL("/api/v0", mbBaseUrl).toString(),
      accessToken: mbApiKey,
    });
  }, [mbBaseUrl, mbApiKey]);

  // Memoize Api
  const contractsApi = useMemo(() => new ContractsApi(mbConfig), [mbConfig]);
  const eventsApi = useMemo(() => new EventsApi(mbConfig), [mbConfig]);
  const eventQueriesApi = useMemo(() => new EventQueriesApi(mbConfig), [mbConfig]);
  const chainsApi = useMemo(() => new ChainsApi(mbConfig), [mbConfig]);
  const [groupId, setGroupId] = useState(localStorage.getItem("groupId"));

  const { address, isConnected } = useAccount();

  const getChainStatus = async (): Promise<ChainStatus | null> => {
    try {
      const response = await chainsApi.getChainStatus(chain);
      return response.data.result as ChainStatus;
    } catch (err) {
      console.error("Error getting chain status:", err);
      return null;
    }
  };

  const callContractFunction = useCallback(
    async (methodName: string, args: PostMethodArgs['args'] = [], useSemaphore=false): Promise<MethodCallResponse['output'] | TransactionToSignResponse['tx']> => {
      const payload: PostMethodArgs = {
        args,
        contractOverride: true,
        ...(isConnected && address ? { from: address } : {}),
      };

      const response = await contractsApi.callContractFunction(
        chain,
        useSemaphore ? semaphoreAddressLabel : votingAddressLabel,
        useSemaphore ? semaphoreContractLabel : votingContractLabel,
        methodName,
        payload
      );

      if (response.data.result.kind === "MethodCallResponse") {
        return response.data.result.output;
      } else if (response.data.result.kind === "TransactionToSignResponse") {
        return response.data.result.tx;
      } else {
        throw new Error(`Unexpected response type: ${response.data.result.kind}`);
      }
    },
    [contractsApi, chain, votingAddressLabel, votingContractLabel, isConnected, address]
  );

  useEffect(() => {
    if(!groupId){
      getGroupId();
    }
    async function getGroupId() {
      const output = await callContractFunction("groupId")
      setGroupId(output)
      localStorage.setItem("groupId", output)
    }
  }, [])

  // const _getCommitmentsFromMemberAddedEvents = useCallback(async (): Promise<Array<bigint> | null> => {
  //   try {
  //     const eventSignature = "MemberAdded(uint256,uint256,uint256,uint256)";
  //     const response = await eventsApi.listEvents(
  //       undefined,
  //       undefined,
  //       undefined,
  //       undefined,
  //       undefined,
  //       false,
  //       chain,
  //       semaphoreAddress,
  //       undefined,
  //       eventSignature,
  //       50
  //     );
  //     const events: Event[] = response.data.result
  //       .filter(event => event.transaction.contract.addressLabel === votingAddressLabel)
  //     const commitments = events
  //       .sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime())
  //       .map(item => item.event.inputs[2].value)
  //     return commitments;
  //   } catch (err) {
  //     console.error("Error getting member added events:", err);
  //     return null;
  //   }
  // }, [eventsApi, chain, votingAddressLabel]);

  const _getCommitmentsFromQuery = useCallback(async (): Promise<Array<bigint> | null> => {
    const queryLabel = "commitments";
    try {

      const response = await eventQueriesApi.executeEventQuery(queryLabel, undefined, 50);
      const commitments = response.data.result.rows.map((row) => row.identitycommitment);
      return commitments;
    } catch(e) {
      console.error("Error getting member added events:", e);
      return null;
    }
  }, [eventQueriesApi, chain, callContractFunction])

  const joinGroup = useCallback(async (secretCode: string, identity: Identity): Promise<SendTransactionParameters>  => {
    return await callContractFunction("joinGroup", [secretCode, identity!.commitment.toString()]);
  }, [callContractFunction])

  const checkCommitmentInGroup = useCallback(async (identity: Identity): Promise<MethodCallResponse['output']>  => {
    if (!groupId) {
      throw Error("groupId uncertain")
    }
    return await callContractFunction("hasMember", [groupId, identity!.commitment.toString()], true);
  }, [callContractFunction, groupId])

  const clearVote = useCallback(async (): Promise<SendTransactionParameters> => {
    return await callContractFunction("clearVote");
  }, [callContractFunction]);

  const getVotes = useCallback(async (): Promise<string[] | null> => {
    try {
      const votes = await callContractFunction("getVotes");
      return votes;
    } catch (err) {
      console.error("Error getting votes:", err);
      return null;
    }
  }, [callContractFunction]);

  const hasVoted = useCallback(async (ethAddress: string): Promise<boolean | null> => {
    try {
      const result = await callContractFunction("hasVoted", [ethAddress]);
      return result
    } catch (err) {
      console.error("Error checking if user has voted:", err);
      return null;
    }
  }, [callContractFunction]);
  
  const castVote = useCallback(async (choice: string): Promise<SendTransactionParameters> => {
    if (!identity) throw Error("No identity")
    if (!groupId) throw Error("No groupId")
    const scope = groupId;

    // You have two API to get commitments

    // First choice: Get all events and filter on frontend side
    // const commitments = await _getCommitmentsFromMemberAddedEvents()

    // Second choice: Get commitments from a event query
    const commitments = await _getCommitmentsFromQuery()

    if (!commitments?.length) throw Error("No members in this group")

    const index = await callContractFunction("indexOf", [groupId, identity?.commitment.toString()], true)
    const merkelProof = await generateMerkleProof(commitments, Number(index))

    const proof = await generateSemaphoreProof(identity, merkelProof, choice, scope)

    console.log('generateSemaphoreProof', proof)

    return await callContractFunction("vote", [
      proof.merkleTreeDepth,
      proof.merkleTreeRoot,
      proof.nullifier,
      proof.message,
      proof.points,
    ]);

  }, [callContractFunction, groupId, identity]);

  const getUserVotes = useCallback(async (ethAddress: string): Promise<string | null> => {
    try {
      const result = await callContractFunction("votes", [ethAddress]);
      return result as string;
    } catch (err) {
      console.error("Error getting user's vote:", err);
      return null;
    }
  }, [callContractFunction]);

  const getVotedEvents = useCallback(async (): Promise<Array<Event> | null> => {
    try {
      const eventSignature = "Voted(address,uint256,int8)";
      const response = await eventsApi.listEvents(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
        chain,
        votingAddressLabel,
        votingContractLabel,
        eventSignature,
        50
      );

      return response.data.result;
    } catch (err) {
      console.error("Error getting voted events:", err);
      return null;
    }
  }, [eventsApi, chain, votingAddressLabel, votingContractLabel]);

  return {
    joinGroup,
    getChainStatus,
    checkCommitmentInGroup,
    clearVote,
    getVotes,
    hasVoted,
    castVote,
    getUserVotes,
    getVotedEvents,
  };
};

export default useMultiBaas;
