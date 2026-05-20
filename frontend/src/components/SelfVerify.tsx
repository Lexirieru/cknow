'use client'

import { useState, useEffect } from 'react'
import { SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode'
import dynamic from 'next/dynamic'
import type { Address } from 'viem'
import { T } from '@/components/design-system'

// SelfQRcodeWrapper hanya jalan di client, tidak support SSR
const SelfQRcodeWrapper = dynamic(
  () => import('@selfxyz/qrcode').then(m => m.SelfQRcodeWrapper),
  { ssr: false }
)

const SCOPE = 'cknow-identity'
const ENDPOINT = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/verify`
  : 'https://app.cknow.xyz/api/verify'

interface Props {
  address: Address
  onVerified?: () => void
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') return false
  return /iPhone|Android/i.test(navigator.userAgent)
}

export default function SelfVerify({ address, onVerified }: Props) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  const selfApp = new SelfAppBuilder({
    appName: 'cknow',
    scope: SCOPE,
    endpoint: ENDPOINT,
    endpointType: 'https',
    userId: address,
    userIdType: 'hex',
    disclosures: {
      minimumAge: 18,
      ofac: true,
    },
  }).build()

  const deepLink = getUniversalLink(selfApp)

  if (status === 'success') {
    return (
      <div style={{ padding: '16px', background: T.successBg, border: `1px solid rgba(74,222,128,0.3)`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: T.success, fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 12, color: T.success, fontFamily: T.codeFont }}>Identity verified</span>
      </div>
    )
  }

  return (
    <div>
      {status === 'error' && (
        <div style={{ padding: '10px 14px', background: T.dangerBg, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 4, marginBottom: 12, fontSize: 11, color: T.danger, fontFamily: T.codeFont }}>
          {errorMsg || 'Verification failed. Try again.'}
        </div>
      )}

      {isMobile ? (
        <a
          href={deepLink}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: T.accentLight, border: `1px solid ${T.tagBorder}`,
            borderRadius: 4, padding: '10px 18px', fontSize: 11,
            fontFamily: T.codeFont, letterSpacing: '0.08em', color: T.accent,
            textDecoration: 'none',
          }}
        >
          <span>▶</span> VERIFY WITH SELF APP
        </a>
      ) : (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, padding: '20px', display: 'inline-block' }}>
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={() => {
              setStatus('success')
              onVerified?.()
            }}
            onError={(err: unknown) => {
              setStatus('error')
              setErrorMsg(typeof err === 'string' ? err : 'Verification failed')
            }}
            type="websocket"
            darkMode
          />
          <p style={{ fontSize: 10, color: T.muted, fontFamily: T.codeFont, margin: '12px 0 0', textAlign: 'center', letterSpacing: '0.06em' }}>
            SCAN WITH SELF APP
          </p>
        </div>
      )}
    </div>
  )
}
