import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'cknow — Knowledge that pays',
  description: 'Decentralized knowledge protocol on Celo. Submit verifiable knowledge, earn iNFTs, and get rewarded when your data is queried by AI agents.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', background: '#09090b' }}>
        {children}
      </body>
    </html>
  )
}
