'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WalletButton } from './WalletButton'
import { T } from './design-system'

const NAV = [
  { href: '/explore', label: 'EXPLORE' },
  { href: '/submit',  label: 'SUBMIT'  },
  { href: '/market',  label: 'MARKET'  },
  { href: '/profile', label: 'PROFILE' },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <header style={{
      background: T.surface,
      borderBottom: `2px solid ${T.border}`,
      display: 'flex',
      alignItems: 'stretch',
      height: 56,
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderRight: `2px solid ${T.border}`,
        textDecoration: 'none',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: T.pixelFont, fontSize: 11, color: T.accent, whiteSpace: 'nowrap' }}>
          ▶ CKNOW
        </span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', flex: 1 }}>
        {NAV.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 18px',
                fontFamily: T.pixelFont,
                fontSize: 7,
                letterSpacing: '0.05em',
                color: active ? '#000' : T.muted,
                background: active ? T.accent : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderRight: `2px solid ${T.border}`,
              }}
            >
              {active && <span style={{ marginRight: 6 }}>▸</span>}
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Wallet */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        borderLeft: `2px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <WalletButton />
      </div>
    </header>
  )
}
