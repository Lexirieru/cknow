import type { Metadata } from 'next'
import { headers } from 'next/headers'
import './globals.css'
import { Providers } from '@/lib/providers'
import { TopBar } from '@/components/TopBar'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'cknow — Decentralized Knowledge Protocol',
  description: 'Submit verifiable knowledge on Celo. Earn iNFTs and royalties when your data is queried.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const cookies = headersList.get('cookie')

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: '100vh', display: 'flex', flexDirection: 'column', background: '#09090b', overflow: 'hidden' }}>
        <Providers cookies={cookies}>
          <TopBar />
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
