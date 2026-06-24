import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Navbar } from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'cknow — Decentralized Knowledge Protocol',
  description: 'Submit verifiable knowledge on Celo. Earn iNFTs and royalties when your data is queried.',
  other: {
    'talentapp:project_verification': '5697380053c5308cd09b89e0cb9a003ac9ecea191cd2f75aba349c1d3988b7b415c1d001bc641c9e8b40d3e27ac143b3339c852beb6315704fb7753a400da663',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const cookies = headersList.get('cookie')

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a0f', overflow: 'hidden' }}>
        <Providers cookies={cookies}>
          <Navbar />
          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
