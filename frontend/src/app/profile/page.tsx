'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getEntries, type Entry } from '@/lib/api'
import { T, Tag, LoadingDots } from '@/components/design-system'
import dynamic from 'next/dynamic'

const SelfVerify = dynamic(() => import('@/components/SelfVerify'), { ssr: false })
const SelfAgentId = dynamic(() => import('@/components/SelfAgentId'), { ssr: false })

const DOMAINS: Record<number, string> = { 0: 'FACTUAL', 1: 'LABELED', 3: 'OBS' }

function truncate(addr: string, len = 6) {
  return `${addr.slice(0, len)}…${addr.slice(-4)}`
}

function PixelCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 16, letterSpacing: '0.05em' }}>
        ▸ {label}
      </div>
      {children}
    </div>
  )
}

function IdentitySection({ address }: { address: `0x${string}` }) {
  const [verified, setVerified] = useState(false)
  const [showVerify, setShowVerify] = useState(false)

  return (
    <PixelCard label="SELF IDENTITY VERIFICATION">
      {verified ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Tag variant="success">✓ ZK VERIFIED</Tag>
          <span style={{ fontFamily: T.codeFont, fontSize: 10, color: T.success }}>Identity confirmed</span>
        </div>
      ) : showVerify ? (
        <SelfVerify address={address} onVerified={() => setVerified(true)} />
      ) : (
        <>
          <p style={{ fontSize: 10, color: T.muted, fontFamily: T.codeFont, lineHeight: 1.8, margin: '0 0 16px' }}>
            Verify your identity with zero-knowledge proof. No personal data stored.
          </p>
          <button
            onClick={() => setShowVerify(true)}
            style={{
              background: T.accentLight,
              color: T.accent,
              border: `2px solid ${T.accent}`,
              fontFamily: T.pixelFont,
              fontSize: 7,
              letterSpacing: '0.05em',
              padding: '9px 16px',
              cursor: 'pointer',
              boxShadow: `3px 3px 0 ${T.accentMid}`,
            }}
          >
            VERIFY IDENTITY
          </button>
        </>
      )}
    </PixelCard>
  )
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const [entries, setEntries] = useState<Entry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!address) return
    getEntries()
      .then(all => { setEntries(all.filter(e => e.submitter?.toLowerCase() === address.toLowerCase())); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [address])

  const loading = !!address && !loaded

  if (!isConnected || !address) {
    return (
      <div style={{ padding: '120px 40px', fontFamily: T.pixelFont, color: T.text, textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: T.muted }}>CONNECT WALLET TO VIEW PROFILE.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 40px', fontFamily: T.codeFont, color: T.text, maxWidth: 860 }}>

      {/* Page header */}
      <h1 style={{ fontFamily: T.pixelFont, fontSize: 12, fontWeight: 400, margin: '0 0 28px', color: T.accent }}>
        ▸ PROFILE
      </h1>

      {/* Address card */}
      <div style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '18px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ width: 40, height: 40, background: T.accentLight, border: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.pixelFont, fontSize: 14, color: T.accent, flexShrink: 0 }}>
          ■
        </div>
        <div>
          <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, marginBottom: 8 }}>CONNECTED ADDRESS</div>
          <div style={{ fontSize: 10, color: T.text, fontFamily: T.codeFont, wordBreak: 'break-all' }}>{address}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'ENTRIES', value: loading ? '…' : entries.length },
          { label: 'iNFTs', value: loading ? '…' : entries.filter(e => e.inftTokenId).length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '16px 20px' }}>
            <div style={{ fontFamily: T.pixelFont, fontSize: 20, color: T.accent, marginBottom: 8 }}>{s.value}</div>
            <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Self Agent ID */}
      <PixelCard label="SELF AGENT ID">
        <SelfAgentId address={address} />
      </PixelCard>

      {/* Self Identity */}
      <IdentitySection address={address} />

      {/* Entries */}
      <div style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, margin: '28px 0 16px', letterSpacing: '0.05em' }}>
        ▸ MY ENTRIES
      </div>

      {loading ? (
        <LoadingDots />
      ) : entries.length === 0 ? (
        <p style={{ fontFamily: T.pixelFont, fontSize: 8, color: T.muted }}>NO ENTRIES YET.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(e => (
            <div key={e.entryId} style={{ background: T.surface, border: `2px solid ${T.border}`, boxShadow: '4px 4px 0 rgba(0,0,0,0.4)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <Tag>{DOMAINS[e.domain] ?? `D:${e.domain}`}</Tag>
                {e.inftTokenId && <Tag variant="success">iNFT #{e.inftTokenId}</Tag>}
                {e.tags?.map(t => <Tag key={t} variant="ghost">{t}</Tag>)}
              </div>
              {e.content && (
                <p style={{ fontSize: 10, color: T.text, margin: '0 0 10px', lineHeight: 1.7, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {e.content}
                </p>
              )}
              <span style={{ fontFamily: T.codeFont, fontSize: 9, color: T.muted }}>{truncate(e.entryId, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
