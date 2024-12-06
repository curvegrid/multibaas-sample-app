import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'

function Account() {
  const { address, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: ensName } = useEnsName({ address })
  const { data: ensAvatar } = useEnsAvatar({ name: ensName! })

  return (
    <div className='flex items-center justify-center gap-2'>
      {chain && <div>{chain.name}</div>}
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      {address && <div>{ensName ? `${ensName} (${address.substring(0, 6)}...})` : `${address.substring(0, 6)}...`}</div>}
      <button className="border-2 py-2 px-4 rounded"  onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}

export default Account