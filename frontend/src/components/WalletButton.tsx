'use client'

import { useState, useEffect } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { T } from './design-system'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

const btnBase: React.CSSProperties = {
  border: 'none',
  fontFamily: T.pixelFont,
  fontSize: 7,
  letterSpacing: '0.05em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'transform 0.05s',
}

export function WalletButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const [inMiniPay] = useState(() => {
    if (typeof window === 'undefined') return false
    return (window.ethereum as { isMiniPay?: boolean } | undefined)?.isMiniPay === true
  })

  useEffect(() => {
    if (inMiniPay && !isConnected) {
      connect({ connector: injected() })
    }
  }, [inMiniPay, isConnected, connect])

  if (inMiniPay) {
    if (isConnected && address) {
      return (
        <span style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.accent, letterSpacing: '0.05em' }}>
          ● {truncate(address)}
        </span>
      )
    }
    return (
      <span style={{ fontFamily: T.pixelFont, fontSize: 7, color: T.muted, letterSpacing: '0.05em' }}>
        CONNECTING<span className="pixel-blink">█</span>
      </span>
    )
  }

  if (isConnected && address) {
    return (
      <button
        onClick={() => open({ view: 'Account' })}
        style={{
          ...btnBase,
          background: T.accentLight,
          color: T.accent,
          border: `2px solid ${T.accent}`,
          padding: '6px 12px',
        }}
      >
        ● {truncate(address)}
      </button>
    )
  }

  return (
    <button
      onClick={() => open()}
      style={{
        ...btnBase,
        background: T.accent,
        color: '#000',
        padding: '8px 14px',
        boxShadow: T.pixelShadow,
      }}
    >
      CONNECT
    </button>
  )
}
