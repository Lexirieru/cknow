'use client'

import { useState, useEffect, useRef } from 'react'
import { SelfAgent } from '@selfxyz/agent-sdk'
import type { RegistrationSession, ApiAgentsForHuman, RegistrationResult } from '@selfxyz/agent-sdk'
import dynamic from 'next/dynamic'
import type { Address } from 'viem'
import { T, Tag } from '@/components/design-system'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then(m => m.QRCodeSVG),
  { ssr: false }
)

type Stage = 'loading' | 'has_agents' | 'idle' | 'requesting' | 'awaiting_scan' | 'completed' | 'error'

interface Props {
  address: Address
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|Android/i.test(navigator.userAgent)
}

export default function SelfAgentId({ address }: Props) {
  const [stage, setStage] = useState<Stage>('loading')
  const [agents, setAgents] = useState<ApiAgentsForHuman | null>(null)
  const [deepLink, setDeepLink] = useState<string | null>(null)
  const [, setSessionRef] = useState<RegistrationSession | null>(null)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [isMobile] = useState(() => typeof window !== 'undefined' && isMobileDevice())
  const pollingRef = useRef(false)

  useEffect(() => {
    SelfAgent.getAgentsForHuman(address, { network: 'mainnet' })
      .then(data => {
        setAgents(data)
        setStage(data.totalCount > 0 ? 'has_agents' : 'idle')
      })
      .catch(() => setStage('idle'))
  }, [address])

  const handleRegister = async () => {
    setStage('requesting')
    setErrorMsg('')
    try {
      const session = await SelfAgent.requestRegistration({
        mode: 'linked',
        network: 'mainnet',
        humanAddress: address,
        agentName: `cknow-${address.slice(0, 8)}`,
        agentDescription: 'cknow knowledge protocol agent',
        disclosures: { minimumAge: 18, ofac: true },
      })
      setDeepLink(session.deepLink)
      setSessionRef(session)
      setStage('awaiting_scan')

      // Poll untuk completion di background
      pollingRef.current = true
      session.waitForCompletion({ timeoutMs: 25 * 60 * 1000 })
        .then(res => {
          if (!pollingRef.current) return
          setResult(res)
          setStage('completed')
        })
        .catch(err => {
          if (!pollingRef.current) return
          setErrorMsg(typeof err?.message === 'string' ? err.message : 'Registration timed out or failed')
          setStage('error')
        })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start registration'
      setErrorMsg(msg)
      setStage('error')
    }
  }

  useEffect(() => {
    return () => { pollingRef.current = false }
  }, [])

  if (stage === 'loading') {
    return (
      <div style={{ padding: '12px 0', fontSize: 11, color: T.muted, fontFamily: T.codeFont }}>
        Checking on-chain agents…
      </div>
    )
  }

  if (stage === 'completed' && result) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ color: T.success, fontSize: 14 }}>✓</span>
          <span style={{ fontSize: 12, color: T.success, fontFamily: T.codeFont }}>Agent registered on Celo Mainnet</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag variant="success">AGENT ID #{result.agentId}</Tag>
          <Tag variant="ghost">{result.agentAddress.slice(0, 10)}…{result.agentAddress.slice(-6)}</Tag>
        </div>
        <a
          href={`https://celoscan.io/tx/${result.txHash}`}
          target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', marginTop: 10, fontSize: 10, color: T.muted, fontFamily: T.codeFont }}
        >
          view tx on Celoscan ↗
        </a>
      </div>
    )
  }

  if (stage === 'has_agents' && agents) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {agents.agents.map(a => (
            <div key={a.agentId} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: '8px 12px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                <Tag variant={a.isVerified ? 'success' : 'warning'}>
                  {a.isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                </Tag>
                <Tag>AGENT #{a.agentId}</Tag>
              </div>
              <div style={{ fontSize: 10, color: T.muted, fontFamily: T.codeFont }}>
                {a.agentAddress.slice(0, 10)}…{a.agentAddress.slice(-6)}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleRegister}
          style={{
            background: 'transparent', color: T.muted,
            border: `1px solid ${T.border}`,
            fontFamily: T.codeFont, fontSize: 9, letterSpacing: '0.1em',
            padding: '7px 14px', borderRadius: 3, cursor: 'pointer',
          }}
        >
          + REGISTER ANOTHER AGENT
        </button>
      </div>
    )
  }

  if (stage === 'awaiting_scan' && deepLink) {
    return (
      <div>
        <p style={{ fontSize: 11, color: T.muted, fontFamily: T.codeFont, lineHeight: 1.7, margin: '0 0 16px' }}>
          {isMobile
            ? 'Tap the button below to open the Self app and verify your identity.'
            : 'Scan the QR code with the Self app to link your passport proof on-chain.'}
        </p>

        {isMobile ? (
          <a
            href={deepLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: T.accentLight, border: `1px solid ${T.tagBorder}`,
              borderRadius: 4, padding: '10px 18px', fontSize: 11,
              fontFamily: T.codeFont, letterSpacing: '0.08em', color: T.accent,
              textDecoration: 'none', marginBottom: 16,
            }}
          >
            ▶ OPEN SELF APP
          </a>
        ) : (
          <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 4, padding: 16, display: 'inline-block', marginBottom: 16 }}>
            <QRCodeSVG value={deepLink} size={180} bgColor={T.bg} fgColor={T.text} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.warningBg, border: `1px solid rgba(251,191,36,0.3)`, borderRadius: 4 }}>
          <span style={{ color: T.warning, fontSize: 12 }}>◎</span>
          <span style={{ fontSize: 11, color: T.warning, fontFamily: T.codeFont }}>Waiting for on-chain confirmation…</span>
        </div>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div>
        <div style={{ padding: '10px 14px', background: T.dangerBg, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 4, marginBottom: 12, fontSize: 11, color: T.danger, fontFamily: T.codeFont }}>
          {errorMsg || 'Something went wrong.'}
        </div>
        <button
          onClick={() => { setStage('idle'); setErrorMsg('') }}
          style={{ background: 'transparent', color: T.muted, border: `1px solid ${T.border}`, fontFamily: T.codeFont, fontSize: 9, letterSpacing: '0.1em', padding: '7px 14px', borderRadius: 3, cursor: 'pointer' }}
        >
          TRY AGAIN
        </button>
      </div>
    )
  }

  // idle / requesting
  return (
    <div>
      <p style={{ fontSize: 11, color: T.muted, fontFamily: T.codeFont, lineHeight: 1.7, margin: '0 0 16px' }}>
        Register this address as a verified AI agent on Celo Mainnet. Proof-of-human is anchored via your passport — no personal data stored on-chain.
      </p>
      <button
        onClick={handleRegister}
        disabled={stage === 'requesting'}
        style={{
          background: stage === 'requesting' ? 'transparent' : T.accent,
          color: stage === 'requesting' ? T.muted : '#000',
          border: `1px solid ${stage === 'requesting' ? T.border : T.accent}`,
          fontFamily: T.codeFont, fontSize: 9, fontWeight: 700,
          letterSpacing: '0.1em', padding: '9px 20px', borderRadius: 3,
          cursor: stage === 'requesting' ? 'not-allowed' : 'pointer',
        }}
      >
        {stage === 'requesting' ? 'CONNECTING TO SELF…' : 'REGISTER AGENT ID'}
      </button>
    </div>
  )
}
