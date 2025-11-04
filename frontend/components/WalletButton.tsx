import React, { useEffect, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

const WalletButton: React.FC = () => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until the component has mounted on the client
  if (!mounted) {
    return (
      <button className="bg-purple-600 text-white px-4 py-2 rounded-lg">
        Connect Wallet
      </button>
    )
  }

  return <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
}

export default WalletButton