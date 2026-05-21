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
    <div style={{ padding: '48px 48px', fontFamily: T.codeFont, color: T.text, maxWidth: 1000, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.pixelFont, fontSize: 14, fontWeight: 400, margin: '0 0 14px', color: T.accent, letterSpacing: '0.03em' }}>
          MARKET
        </h1>
        <p style={{ fontSize: 10, color: T.muted, margin: 0 }}>Buy and sell knowledge iNFTs.</p>
      </div>

      {loading && <LoadingDots />}

      {error && (
        <div style={{ background: T.dangerBg, border: `2px solid rgba(255,36,66,0.4)`, padding: '12px 16px', fontSize: 10, color: T.danger, marginBottom: 20, boxShadow: '4px 4px 0 rgba(255,36,66,0.15)' }}>
          ✕ {error}
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <p style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.muted }}>NO ACTIVE LISTINGS.</p>
        </div>
      )}

      {listings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {listings.map(l => (
            <div
              key={l.tokenId}
              style={{
                background: T.surface,
                border: `2px solid ${T.border}`,
                boxShadow: '4px 4px 0 rgba(0,0,0,0.4)',
                padding: 20,
              }}
            >
              {/* iNFT id + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 6 }}>iNFT</div>
                  <div style={{ fontFamily: T.pixelFont, fontSize: 16, color: T.accent }}>#{l.tokenId}</div>
                </div>
                <Tag variant="success">ACTIVE</Tag>
              </div>

              {/* Seller */}
              <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 4 }}>SELLER</div>
              <div style={{ fontSize: 10, color: T.text, marginBottom: 14, fontFamily: T.codeFont }}>{truncate(l.seller)}</div>

              {/* Price */}
              <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 4 }}>PRICE</div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: T.pixelFont, fontSize: 12, color: T.text }}>{l.price}</span>
                <span style={{ fontFamily: T.codeFont, fontSize: 9, color: T.muted, marginLeft: 6 }}>{truncate(l.paymentToken)}</span>
              </div>

              {/* Buy action */}
              {!isConnected ? (
                <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted }}>CONNECT TO BUY</div>
              ) : (
                <button
                  style={{
                    width: '100%',
                    background: T.accent,
                    color: '#000',
                    border: 'none',
                    padding: '10px 0',
                    fontFamily: T.pixelFont,
                    fontSize: 8,
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    boxShadow: T.pixelShadow,
                  }}
                  onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'translate(4px,4px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = T.pixelShadow }}
                >
                  ▶ BUY
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
