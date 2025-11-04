import React, { useState, useCallback } from 'react'
import { NextPage } from 'next'
import Head from 'next/head'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'

import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY

const Verify: NextPage = () => {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verified' | 'not-verified'>('idle')
  const [attestations, setAttestations] = useState<any[]>([])

  const handleVerify = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey) {
      return
    }

    setIsLoading(true)
    setVerificationStatus('idle')

    try {
      // Fetch compressed NFTs using Helius DAS API
      const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: wallet.publicKey.toString(),
            page: 1,
            limit: 1000,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch assets')
      }

      const data = await response.json()
      const assets = data.result?.items || []

      // Filter for GitHub Developer attestations
      const githubAttestations = assets.filter((asset: any) => 
        asset.content?.metadata?.name === 'GitHub Developer' &&
        asset.content?.metadata?.symbol === 'DEV'
      )

      setAttestations(githubAttestations)
      setVerificationStatus(githubAttestations.length > 0 ? 'verified' : 'not-verified')

    } catch (error) {
      console.error('Verification error:', error)
      setVerificationStatus('not-verified')
    } finally {
      setIsLoading(false)
    }
  }, [wallet])

  return (
    <>
      <Head>
        <title>VeriSol - Verify GitHub Developer cATT</title>
        <meta name="description" content="Verify your GitHub Developer Compressed Attestation" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Verify cATT
            </CardTitle>
            <CardDescription>
              Check if you have a valid GitHub Developer Compressed Attestation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Connect Wallet */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Step 1: Connect Wallet</h3>
              <WalletMultiButton className="w-full" />
            </div>

            {/* Step 2: Verify */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Step 2: Check for cATT</h3>
              <Button
                onClick={handleVerify}
                disabled={!wallet.connected || isLoading}
                className="w-full"
              >
                {isLoading ? 'Checking...' : 'Verify Attestation'}
              </Button>
            </div>

            {/* Step 3: Status */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Step 3: Verification Status</h3>
              {verificationStatus === 'verified' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-lg font-semibold text-green-800">Verified</p>
                  <p className="text-sm text-green-600">
                    You have {attestations.length} GitHub Developer attestation(s)
                  </p>
                </div>
              )}

              {verificationStatus === 'not-verified' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <div className="text-4xl mb-2">❌</div>
                  <p className="text-lg font-semibold text-red-800">Not Verified</p>
                  <p className="text-sm text-red-600">
                    No GitHub Developer attestations found
                  </p>
                </div>
              )}

              {verificationStatus === 'idle' && !isLoading && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <div className="text-4xl mb-2">⏳</div>
                  <p className="text-lg font-semibold text-gray-800">Ready to Verify</p>
                  <p className="text-sm text-gray-600">
                    Click &ldquo;Verify Attestation&rdquo; to check your status
                  </p>
                </div>
              )}
            </div>

            {/* Attestation Details */}
            {attestations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Attestation Details</h3>
                {attestations.map((attestation, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800">
                      {attestation.content?.metadata?.name}
                    </p>
                    <p className="text-xs text-blue-600">
                      ID: {attestation.id}
                    </p>
                    {attestation.content?.metadata?.uri && (
                      <a
                        href={attestation.content.metadata.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 underline"
                      >
                        View Metadata
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="pt-4 border-t">
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="w-full"
              >
                ← Back to Mint
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default Verify