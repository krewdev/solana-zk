// frontend/pages/api/verify-attestation.ts
import { NextApiRequest, NextApiResponse } from 'next'

interface VerificationRequest {
  walletAddress: string
  attestationType?: 'developer' | 'all'
}

interface Attestation {
  id: string
  name: string
  symbol: string
  uri: string
  collection?: string
}

interface VerificationResponse {
  verified: boolean
  attestations: Attestation[]
  hasDeveloperAttestation: boolean
  error?: string
}

const HELIUS_API_KEY = process.env.HELIUS_API_KEY

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerificationResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      verified: false,
      attestations: [],
      hasDeveloperAttestation: false,
      error: 'Method not allowed'
    })
  }

  const { walletAddress, attestationType = 'developer' } = req.query as VerificationRequest & { [key: string]: string | string[] }

  // Validate wallet address
  if (!walletAddress) {
    return res.status(400).json({
      verified: false,
      attestations: [],
      hasDeveloperAttestation: false,
      error: 'Wallet address is required'
    })
  }

  // Basic Solana address validation (32 bytes, base58)
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
    return res.status(400).json({
      verified: false,
      attestations: [],
      hasDeveloperAttestation: false,
      error: 'Invalid wallet address format'
    })
  }

  if (!HELIUS_API_KEY) {
    return res.status(500).json({
      verified: false,
      attestations: [],
      hasDeveloperAttestation: false,
      error: 'API configuration error'
    })
  }

  try {
    // Fetch compressed NFTs using Helius DAS API
    const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'verify-attestation',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: walletAddress,
          page: 1,
          limit: 1000, // Get all assets to ensure we don't miss attestations
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status}`)
    }

    const data = await response.json()
    const assets = data.result?.items || []

    // Filter for GitHub Developer attestations
    const githubAttestations = assets.filter((asset: any) => 
      asset.content?.metadata?.name === 'GitHub Developer' &&
      asset.content?.metadata?.symbol === 'DEV'
    )

    // Map to our attestation interface
    const attestations: Attestation[] = githubAttestations.map((asset: any) => ({
      id: asset.id,
      name: asset.content?.metadata?.name || '',
      symbol: asset.content?.metadata?.symbol || '',
      uri: asset.content?.metadata?.uri || '',
      collection: asset.content?.metadata?.collection || undefined,
    }))

    const hasDeveloperAttestation = attestations.length > 0
    const verified = attestationType === 'developer' ? hasDeveloperAttestation : attestations.length > 0

    return res.status(200).json({
      verified,
      attestations,
      hasDeveloperAttestation,
    })

  } catch (error) {
    console.error('Verification error:', error)
    return res.status(500).json({
      verified: false,
      attestations: [],
      hasDeveloperAttestation: false,
      error: 'Failed to verify attestations'
    })
  }
}