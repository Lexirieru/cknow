'use client'

import { useState, useEffect } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { useAccount, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { T } from './design-system'

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
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

  // MiniPay: connection implicit, jangan tampilkan tombol connect
  if (inMiniPay) {
    if (isConnected && address) {
      return (
        <span style={{ fontFamily: T.codeFont, fontSize: 10, color: T.accent, letterSpacing: '0.08em' }}>
          ● {truncate(address)}
        </span>
      )
    }
    return (
      <span style={{ fontFamily: T.codeFont, fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>
        connecting...
      </span>
    )
  }

  // Luar MiniPay: pakai AppKit modal
  if (isConnected && address) {
    return (
      <button
        onClick={() => open({ view: 'Account' })}
        style={{
          background: T.accentLight, border: `1px solid ${T.tagBorder}`,
          borderRadius: 3, padding: '5px 14px', fontFamily: T.codeFont,
          fontSize: 10, letterSpacing: '0.08em', color: T.accent, cursor: 'pointer',
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
        background: T.accent, border: 'none', borderRadius: 3,
        padding: '7px 16px', fontFamily: T.codeFont, fontSize: 10,
        letterSpacing: '0.1em', color: '#000', cursor: 'pointer', fontWeight: 700,
      }}
    >
      CONNECT WALLET
    </button>
  )
}
