'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getEntries, type Entry } from '@/lib/api'
import { T, Tag, LoadingDots } from '@/components/design-system'
import dynamic from 'next/dynamic'

const SelfVerify = dynamic(() => import('@/components/SelfVerify'), { ssr: false })
const SelfAgentId = dynamic(() => import('@/components/SelfAgentId'), { ssr: false })

const DOMAINS: Record<number, string> = { 0: 'Factual', 1: 'Labeled', 3: 'Observation' }

function truncate(addr: string, len = 6) {
  return `${addr.slice(0, len)}…${addr.slice(-4)}`
}

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '20px 24px', marginBottom: 16 }}>
      <h2 style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 14, color: T.muted, fontFamily: T.codeFont, margin: '0 0 14px' }}>
        {label}
      </h2>
      {children}
    </div>
  )
}

function IdentitySection({ address }: { address: `0x${string}` }) {
  const [verified, setVerified] = useState(false)
  const [showVerify, setShowVerify] = useState(false)

  return (
    <SectionCard label="SELF IDENTITY VERIFICATION">
      {verified ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.success, fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, color: T.success, fontFamily: T.codeFont }}>ZK identity verified</span>
        </div>
      ) : showVerify ? (
        <SelfVerify address={address} onVerified={() => setVerified(true)} />
      ) : (
        <>
          <p style={{ fontSize: 11, color: T.muted, fontFamily: T.codeFont, lineHeight: 1.7, margin: '0 0 16px' }}>
            Verify your real-world identity with zero-knowledge proof. No personal data stored — only cryptographic attestation.
          </p>
          <button
            onClick={() => setShowVerify(true)}
            style={{
              background: T.accentLight, color: T.accent,
              border: `1px solid ${T.tagBorder}`,
              fontFamily: T.codeFont, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', padding: '8px 18px', borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            VERIFY IDENTITY
          </button>
        </>
      )}
    </SectionCard>
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
      <div style={{ padding: '80px 28px', fontFamily: T.codeFont, color: T.text, textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: T.muted }}>Connect wallet to view your profile.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 28px', fontFamily: T.codeFont, color: T.text, maxWidth: 800 }}>
      {/* Header */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: T.accentLight, border: `1px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          ◯
        </div>
        <div>
          <div style={{ fontSize: 9, color: T.muted, marginBottom: 4, letterSpacing: '0.1em' }}>CONNECTED</div>
          <div style={{ fontSize: 12, color: T.text, fontWeight: 700 }}>{address}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'ENTRIES', value: loading ? '…' : entries.length },
          { label: 'iNFTs', value: loading ? '…' : entries.filter(e => e.inftTokenId).length },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.accent, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Self Agent ID */}
      <SectionCard label="SELF AGENT ID">
        <SelfAgentId address={address} />
      </SectionCard>

      {/* Self Identity Verification */}
      <IdentitySection address={address} />

      {/* Entries */}
      <h2 style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', margin: '24px 0 14px', color: T.muted }}>MY ENTRIES</h2>

      {loading ? (
        <LoadingDots />
      ) : entries.length === 0 ? (
        <p style={{ fontSize: 12, color: T.muted }}>No entries submitted yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map(e => (
            <div key={e.entryId} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '14px 16px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                <Tag>{DOMAINS[e.domain] ?? `domain:${e.domain}`}</Tag>
                {e.inftTokenId && <Tag variant="success">iNFT #{e.inftTokenId}</Tag>}
                {e.tags?.map(t => <Tag key={t} variant="ghost">{t}</Tag>)}
              </div>
              {e.content && (
                <p style={{ fontSize: 11, color: T.text, margin: '0 0 8px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {e.content}
                </p>
              )}
              <span style={{ fontSize: 9, color: T.muted }}>{truncate(e.entryId, 10)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
