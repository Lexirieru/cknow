'use client'

import Link from 'next/link'
import { WalletButton } from './WalletButton'
import { T } from './design-system'

export function TopBar() {
  return (
    <header style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      background: T.bg,
      borderBottom: `1px solid ${T.border}`,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      flexShrink: 0,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontFamily: T.codeFont, fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', color: T.text }}>
          ck<span style={{ color: T.accent }}>now</span>
        </span>
      </Link>
      <WalletButton />
    </header>
  )
}
