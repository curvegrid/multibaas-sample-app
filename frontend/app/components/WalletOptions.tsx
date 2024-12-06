import * as React from 'react'
import { useConnect } from 'wagmi'

function WalletOptions() {
  const { connectors, connect } = useConnect()

  return connectors.map((connector) => (
    <button className="border-2 py-2 px-4 rounded" key={connector.uid} onClick={() => connect({ connector })}>
      Connect {connector.name}
    </button>
  ))
}

export default WalletOptions