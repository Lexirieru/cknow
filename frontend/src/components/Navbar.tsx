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
      height: 60,
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        borderRight: `2px solid ${T.border}`,
        textDecoration: 'none',
        flexShrink: 0,
        gap: 10,
      }}>
        <span style={{ fontFamily: T.pixelFont, fontSize: 13, color: T.accent, whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
          ▶ CKNOW
        </span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: 'flex', flex: 1, alignItems: 'stretch' }}>
        {NAV.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 22px',
                fontFamily: T.pixelFont,
                fontSize: 8,
                letterSpacing: '0.06em',
                color: active ? '#000' : T.muted,
                background: active ? T.accent : 'transparent',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                borderRight: `1px solid ${T.border}`,
                transition: 'color 0.1s, background 0.1s',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.text }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = T.muted }}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Wallet */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        borderLeft: `2px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <WalletButton />
      </div>
    </header>
  )
}
