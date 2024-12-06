"use client";

import type { UseWaitForTransactionReceiptReturnType } from "wagmi";
import React, { useState } from "react";
import { useAccount } from 'wagmi'
import Voting from "./components/Voting";
import Events from "./components/Events";
import Membership from "./components/Membership";
import Account from './components/Account';
import WalletOptions from './components/WalletOptions';

const Home: React.FC = () => {
  const [txReceipt, setTxReceipt] = useState<UseWaitForTransactionReceiptReturnType['data']>();

  function ConnectWallet() {
    const { isConnected } = useAccount()
    if (isConnected) return <Account />
    return <WalletOptions />
  }

  return (
    <div>
      <div className="navbar">
        <h1 className="app-title">Simple Voting DApp</h1>
        <ConnectWallet />
        {/* <ConnectButton /> */}
      </div>
      <div>
        <Membership />
        <Voting setTxReceipt={setTxReceipt} />
        <Events txReceipt={txReceipt} />
      </div>
    </div>
  );
};

export default Home;