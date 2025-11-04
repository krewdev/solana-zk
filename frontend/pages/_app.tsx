import React, { useMemo } from 'react'
import { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import { SessionProvider } from 'next-auth/react'

// Import wallet adapter CSS
require('@solana/wallet-adapter-react-ui/styles.css')
import '../styles/globals.css'

// Dynamically import wallet components to avoid SSR issues
const WalletConnectionProvider = dynamic(
  () => import('../components/WalletConnectionProvider'),
  { ssr: false }
)

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <WalletConnectionProvider>
        <Component {...pageProps} />
      </WalletConnectionProvider>
    </SessionProvider>
  )
}

export default MyApp