"use client";
import React, { useCallback, useEffect, useState, ChangeEvent } from "react";
import {
  useSendTransaction,
  useWaitForTransactionReceipt,
} from "wagmi";
import useMultiBaas from "../hooks/useMultiBaas";
import useSemaphore from "../hooks/useSemaphore";
import ProgressBar from "./ProgressBar";

const Membership: React.FC = () => {
  const { joinGroup, checkCommitmentInGroup } = useMultiBaas();
  const { createIdentity, identity } = useSemaphore();
  const [secretCode, setSecretCode] = useState<string>();
  const [isJoined, setIsJoined] = useState(false);
  const { sendTransactionAsync } = useSendTransaction();
  const [txHash, setTxHash] = useState<`0x${string}`>();
  const { data: txReceipt } = useWaitForTransactionReceipt({hash: txHash});
  const [loading, setLoading] = useState(false);


  const onSecretUpdate = (event: ChangeEvent<HTMLInputElement>) => {
    setSecretCode(event.target.value)
  }

  const onClickJoin = useCallback(async () => {
    if (!identity || !secretCode) {
      return;
    }
    try {
      setLoading(true)
      const tx = await joinGroup(secretCode, identity);
      const hash = await sendTransactionAsync(tx);
      setTxHash(hash)
    } catch {
      setLoading(false);
    }
  }, [joinGroup, identity, secretCode])

  const onClickCheckCommitment = useCallback(async () => {
    if(!identity) return;
    const result = await checkCommitmentInGroup(identity);
    alert(result ? "Yes! you are in" : "No, you are not in");
    setIsJoined(result);
  }, [checkCommitmentInGroup, identity])

  useEffect(() => setIsJoined(false),[identity] )

  useEffect(() => {
    if (txReceipt) {
      onClickCheckCommitment();
      setLoading(false);
    }
  },[txReceipt])


  return (
    <div className="container">
      <h1 className="title">Create your Identity</h1>
      {!identity ? (
        <div className="flex flex-col justify-center">
        <button className="border-2 py-2 px-4 rounded" onClick={createIdentity}>Create</button>
        </div>
      ) : (
        <div className="flex flex-col justify-center items-center gap-2">
          <button className="self-end border-2 py-1 px-2 rounded" onClick={createIdentity}>🔄</button>
          <div>privateKey: <span className="text-xs">{identity.privateKey}</span></div>
          <div>publicKey: <span className="text-xs">{identity.publicKey[0].toString()}, {identity.publicKey[1].toString()}</span></div>
          <div>commitment: <span className="text-xs">{identity.commitment.toString()}</span></div>
          {!isJoined ? (
            <>
              <button className="self-stretch border-2 py-2 px-4 rounded hover:bg-gray-50" onClick={onClickCheckCommitment}>Check commitment</button>
              <label className="flex flex-col my-2">
                <span>What is the secret code?</span>
                <input className="border-2 w-40 h-10 py-2 px-4 rounded" type="text" onChange={onSecretUpdate}/>
              </label>
              <button className="self-stretch border-2 py-2 px-4 rounded hover:bg-gray-50" onClick={onClickJoin}>Join</button>
            </>
          ) : (
            <>
              <div>you are a part of the group</div>
              <button className="self-stretch border-2 py-2 px-4 rounded hover:bg-gray-50" onClick={onClickCheckCommitment}>Check commitment</button>
            </>
          )}

        </div>
      )}
      {loading && (
        <ProgressBar />
      )}
    </div>
  );
};

export default Membership;
