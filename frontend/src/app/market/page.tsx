'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getMarketListings, type MarketListing } from '@/lib/api'
import { T, Tag, LoadingDots } from '@/components/design-system'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function MarketPage() {
  const { isConnected } = useAccount()
  const [listings, setListings] = useState<MarketListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMarketListings()
      .then(data => setListings(data.filter(l => l.active)))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '32px 28px', fontFamily: T.codeFont, color: T.text, maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>MARKET</h1>
        <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>Buy and sell knowledge iNFTs.</p>
      </div>

      {loading && <LoadingDots />}

      {error && (
        <div style={{ background: T.dangerBg, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 3, padding: '10px 14px', fontSize: 11, color: T.danger, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ fontSize: 12, color: T.muted }}>No active listings.</p>
        </div>
      )}

      {listings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {listings.map(l => (
            <div key={l.tokenId} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, color: T.muted, marginBottom: 4 }}>iNFT</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>#{l.tokenId}</div>
                </div>
                <Tag>ACTIVE</Tag>
              </div>

              <div style={{ fontSize: 9, color: T.muted, marginBottom: 2 }}>SELLER</div>
              <div style={{ fontSize: 10, color: T.text, marginBottom: 14 }}>{truncate(l.seller)}</div>

              <div style={{ fontSize: 9, color: T.muted, marginBottom: 2 }}>PRICE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 16 }}>
                {l.price} <span style={{ fontSize: 9, color: T.muted }}>{truncate(l.paymentToken)}</span>
              </div>

              {!isConnected ? (
                <div style={{ fontSize: 9, color: T.muted }}>Connect wallet to buy</div>
              ) : (
                <button style={{ width: '100%', background: T.accent, color: '#000', border: 'none', borderRadius: 3, padding: '9px 0', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer', fontFamily: T.codeFont }}>
                  BUY
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
