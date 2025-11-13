import NextAuth from 'next-auth'
import GithubProvider from 'next-auth/providers/github'

export default NextAuth({
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  pages: {
    signIn: '/', // Redirect to home page for sign in
    error: '/', // Redirect to home page on error
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `token ${account.access_token}`,
              'User-Agent': 'verisol-protocol-app',
              Accept: 'application/vnd.github+json',
            },
          })

          if (!response.ok) {
            throw new Error(`GitHub profile request failed: ${response.status}`)
          }

          const githubProfile = await response.json()
          ;(token as any).githubProfile = githubProfile
        } catch (error) {
          console.error('Failed to fetch GitHub profile:', error)
          if (profile) {
            ;(token as any).githubProfile = profile
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      ;(session as any).githubProfile = (token as any).githubProfile
      return session
    },
  },
})