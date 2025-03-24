"use client";
import type { PostMethodArgs, MethodCallResponse, TransactionToSignResponse, Event } from "@curvegrid/multibaas-sdk";
import type { SendTransactionParameters } from "@wagmi/core";
import { Configuration, ContractsApi, EventsApi, ChainsApi }from "@curvegrid/multibaas-sdk";
import { useAccount } from "wagmi";
import { useCallback, useMemo } from "react";

interface ChainStatus {
  chainID: number;
  blockNumber: number;
}

interface MultiBaasHook {
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
  const votingAddressAlias =
    process.env.NEXT_PUBLIC_MULTIBAAS_VOTING_ADDRESS_ALIAS || "";

  const chain = "ethereum";

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
  const chainsApi = useMemo(() => new ChainsApi(mbConfig), [mbConfig]);

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
    async (methodName: string, args: PostMethodArgs['args'] = []): Promise<MethodCallResponse['output'] | TransactionToSignResponse['tx']> => {
      const payload: PostMethodArgs = {
        args,
        contractOverride: true,
        ...(isConnected && address ? { from: address } : {}),
      };

      const response = await contractsApi.callContractFunction(
        chain,
        votingAddressAlias,
        votingContractLabel,
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
    [contractsApi, chain, votingAddressAlias, votingContractLabel, isConnected, address]
  );

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
    return await callContractFunction("vote", [choice]);
  }, [callContractFunction]);

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
        votingAddressAlias,
        votingContractLabel,
        eventSignature,
        50
      );

      return response.data.result;
    } catch (err) {
      console.error("Error getting voted events:", err);
      return null;
    }
  }, [eventsApi, chain, votingAddressAlias, votingContractLabel]);

  return {
    getChainStatus,
    clearVote,
    getVotes,
    hasVoted,
    castVote,
    getUserVotes,
    getVotedEvents,
  };
};

export default useMultiBaas;
