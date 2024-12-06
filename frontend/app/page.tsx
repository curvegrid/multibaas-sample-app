"use client";

import type { UseWaitForTransactionReceiptReturnType } from "wagmi";
import React, { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Voting from "./components/Voting";
import Events from "./components/Events";
import Membership from "./components/Membership";

const Home: React.FC = () => {
  const [txReceipt, setTxReceipt] = useState<UseWaitForTransactionReceiptReturnType['data']>();

  return (
    <div>
      <div className="navbar">
        <h1 className="app-title">Simple Voting DApp</h1>
        <ConnectButton />
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
