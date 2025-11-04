import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req })

  if (!session || !(session as any).githubProfile) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const githubProfile = (session as any).githubProfile
    
    // Use the data already available from the OAuth session
    res.status(200).json({
      publicRepos: githubProfile.public_repos || 0,
      login: githubProfile.login,
      name: githubProfile.name,
      avatar_url: githubProfile.avatar_url,
    })
  } catch (error) {
    console.error('Error fetching GitHub data:', error)
    res.status(500).json({ error: 'Failed to fetch GitHub data' })
  }
}